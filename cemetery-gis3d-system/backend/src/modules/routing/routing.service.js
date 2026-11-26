const {
  DEFAULT_NETWORK_NODES,
  DEFAULT_NETWORK_EDGES,
} = require('../../constants/cemeteryConstants');
const { getTerrainHeight, distance3D } = require('../../utils/terrainMath');
const { spatialCache } = require('../../utils/memoryCache');
const routingRepository = require('./routing.repository');

const NODE_SNAP_TOLERANCE_M = 1.5;

const addEdge = (graph, u, v, weight) => {
  if (u === v) return;
  if (!graph[u]) graph[u] = [];
  if (!graph[v]) graph[v] = [];
  graph[u].push({ node: v, weight });
  graph[v].push({ node: u, weight });
};

const runDijkstra = (graph, coords3D, startKey, targetKey) => {
  const distances = {};
  const previous = {};
  const unvisited = new Set(Object.keys(coords3D));

  for (const key of unvisited) {
    distances[key] = Infinity;
  }
  distances[startKey] = 0;

  while (unvisited.size > 0) {
    let current = null;
    for (const node of unvisited) {
      if (current === null || distances[node] < distances[current]) {
        current = node;
      }
    }

    if (current === null || current === targetKey || distances[current] === Infinity) {
      break;
    }

    unvisited.delete(current);

    for (const { node, weight } of graph[current] || []) {
      if (!unvisited.has(node)) continue;
      const alt = distances[current] + weight;
      if (alt < distances[node]) {
        distances[node] = alt;
        previous[node] = current;
      }
    }
  }

  if (!Number.isFinite(distances[targetKey])) {
    return null;
  }

  const pathKeys = [];
  let cursor = targetKey;
  while (cursor) {
    pathKeys.unshift(cursor);
    cursor = previous[cursor];
  }

  return {
    pathKeys,
    routePath: pathKeys.map((k) => coords3D[k]),
    distanceMeters: Number(distances[targetKey].toFixed(2)),
  };
};

/**
 * Dựng đồ thị mạng lưới giao thông 3D động từ các LineStringZ trong bảng tuyen_giao_thong.
 * Tự động gộp các giao lộ gần nhau (<= 1.5m) để đảm bảo tính liên thông (Connectivity).
 */
const buildGraphFromPostgisRoads = (roadRows) => {
  const coords3D = {};
  const graph = {};
  const nodeKeys = [];

  const findOrCreateNode = (x, z) => {
    const y = getTerrainHeight(x, z);
    const candidate = [Number(x.toFixed(2)), Number(y.toFixed(2)), Number(z.toFixed(2))];

    for (const key of nodeKeys) {
      const existing = coords3D[key];
      const dist2D = Math.hypot(existing[0] - candidate[0], existing[2] - candidate[2]);
      if (dist2D <= NODE_SNAP_TOLERANCE_M) {
        return key;
      }
    }

    const newKey = `ROAD_N${nodeKeys.length + 1}`;
    nodeKeys.push(newKey);
    coords3D[newKey] = candidate;
    graph[newKey] = [];
    return newKey;
  };

  for (const row of roadRows) {
    const geom = row.geojson;
    if (!geom || geom.type !== 'LineString' || !Array.isArray(geom.coordinates)) continue;
    let prevKey = null;
    for (const pt of geom.coordinates) {
      const [x, z] = pt;
      if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
      const currKey = findOrCreateNode(x, z);
      if (prevKey && prevKey !== currKey) {
        addEdge(graph, prevKey, currKey, distance3D(coords3D[prevKey], coords3D[currKey]));
      }
      prevKey = currKey;
    }
  }

  return { coords3D, graph, nodeKeys };
};

const findNearestNodeKey = (coords3D, nodeKeys, targetPoint) => {
  let nearest = nodeKeys[0];
  let minDist = Infinity;
  for (const key of nodeKeys) {
    const d = distance3D(coords3D[key], targetPoint);
    if (d < minDist) {
      minDist = d;
      nearest = key;
    }
  }
  return nearest;
};

const buildFallbackGraph = () => {
  const coords3D = {};
  const graph = {};
  const nodeKeys = Object.keys(DEFAULT_NETWORK_NODES);

  for (const [key, [x, z]] of Object.entries(DEFAULT_NETWORK_NODES)) {
    coords3D[key] = [x, getTerrainHeight(x, z), z];
    graph[key] = [];
  }

  for (const [u, v] of DEFAULT_NETWORK_EDGES) {
    addEdge(graph, u, v, distance3D(coords3D[u], coords3D[v]));
  }

  return { coords3D, graph, nodeKeys };
};

const loadCachedRoadRows = async () => {
  const cacheKey = 'routing:roads:raw';
  const cached = spatialCache.get(cacheKey);
  if (cached) return cached;

  try {
    const rows = await routingRepository.findRoadNetworkLines();
    spatialCache.set(cacheKey, rows, 60000);
    return rows;
  } catch {
    return [];
  }
};

/**
 * Tính đường đi ngắn nhất trong không gian 3D bằng thuật toán Dijkstra:
 * Ưu tiên dựng đồ thị động từ bảng tuyen_giao_thong trên PostGIS,
 * tự fallback về đồ thị chuẩn nếu mạng lưới DB trống hoặc bị đứt đoạn.
 */
const calculateShortestRoute3D = async ({ targetX, targetZ, startNode = 'GATE' }) => {
  const startCoord2D = DEFAULT_NETWORK_NODES[startNode] || DEFAULT_NETWORK_NODES.GATE;
  const startPoint = [startCoord2D[0], getTerrainHeight(startCoord2D[0], startCoord2D[1]), startCoord2D[1]];
  const targetPoint = [targetX, getTerrainHeight(targetX, targetZ), targetZ];

  const roadRows = await loadCachedRoadRows();
  let routeSource = 'postgis_network';
  let result = null;
  let nearestNode = 'JUNCTION_B';

  if (roadRows.length > 0) {
    const { coords3D, graph, nodeKeys } = buildGraphFromPostgisRoads(roadRows);
    if (nodeKeys.length >= 2) {
      const startSnap = findNearestNodeKey(coords3D, nodeKeys, startPoint);
      nearestNode = findNearestNodeKey(coords3D, nodeKeys, targetPoint);

      coords3D.START = startPoint;
      coords3D.TARGET = targetPoint;
      addEdge(graph, 'START', startSnap, distance3D(startPoint, coords3D[startSnap]));
      addEdge(graph, nearestNode, 'TARGET', distance3D(coords3D[nearestNode], targetPoint));

      result = runDijkstra(graph, coords3D, 'START', 'TARGET');
    }
  }

  if (!result) {
    routeSource = 'default_graph';
    const { coords3D, graph, nodeKeys } = buildFallbackGraph();
    nearestNode = findNearestNodeKey(coords3D, nodeKeys, targetPoint);
    coords3D.TARGET = targetPoint;
    addEdge(graph, nearestNode, 'TARGET', distance3D(coords3D[nearestNode], targetPoint));
    result = runDijkstra(graph, coords3D, startNode, 'TARGET');
  }

  const elevationGain = Number((targetPoint[1] - startPoint[1]).toFixed(2));
  const estimatedMinutes = Math.max(1, Math.ceil(result.distanceMeters / 60));

  return {
    startNode,
    routeSource,
    nearestNetworkNode: nearestNode,
    routeNodes: result.pathKeys,
    routePath: result.routePath,
    distanceMeters: result.distanceMeters,
    elevationGain,
    estimatedMinutes,
  };
};

const getRoadNetworkGeoJson = async () => {
  const rows = await loadCachedRoadRows();
  return {
    type: 'FeatureCollection',
    features: rows.map((r) => ({
      type: 'Feature',
      id: r.ma_tuyen_duong,
      geometry: r.geojson,
      properties: {
        ma_tuyen_duong: r.ma_tuyen_duong,
        ten_tuyen_duong: r.ten_tuyen_duong,
        loai_duong: r.loai_duong,
        chieu_rong_duong: Number(r.chieu_rong_duong),
      },
    })),
  };
};

module.exports = {
  calculateShortestRoute3D,
  getRoadNetworkGeoJson,
  buildGraphFromPostgisRoads,
  runDijkstra,
};
