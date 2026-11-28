const {
  DEFAULT_NETWORK_NODES,
  DEFAULT_NETWORK_EDGES,
} = require('../../constants/cemeteryConstants');
const { getTerrainHeight, distance3D } = require('../../utils/terrainMath');
const { spatialCache } = require('../../utils/memoryCache');
const AppError = require('../../utils/AppError');
const routingRepository = require('./routing.repository');
const db = require('../../config/database');

const NODE_SNAP_TOLERANCE_M = 0.45;
const JUNCTION_SNAP_TOLERANCE_M = 2.2;
const WALKWAY_ENDPOINT_SNAP_M = 5.2;

const addEdge = (graph, u, v, weight) => {
  if (u === v || !Number.isFinite(weight)) return;
  if (!graph[u]) graph[u] = [];
  if (!graph[v]) graph[v] = [];

  const existingUV = graph[u].find((e) => e.node === v);
  if (!existingUV) {
    graph[u].push({ node: v, weight });
  } else if (weight < existingUV.weight) {
    existingUV.weight = weight;
  }

  const existingVU = graph[v].find((e) => e.node === u);
  if (!existingVU) {
    graph[v].push({ node: u, weight });
  } else if (weight < existingVU.weight) {
    existingVU.weight = weight;
  }
};

const removeEdge = (graph, edges, u, v) => {
  if (graph[u]) graph[u] = graph[u].filter((e) => e.node !== v);
  if (graph[v]) graph[v] = graph[v].filter((e) => e.node !== u);
  for (let i = edges.length - 1; i >= 0; i--) {
    const [a, b] = edges[i];
    if ((a === u && b === v) || (a === v && b === u)) {
      edges.splice(i, 1);
    }
  }
};

const splitEdgeWithNode = (coords3D, graph, edges, u, v, nodeKey) => {
  if (nodeKey === u || nodeKey === v) return;
  removeEdge(graph, edges, u, v);
  addEdge(graph, u, nodeKey, distance3D(coords3D[u], coords3D[nodeKey]));
  addEdge(graph, nodeKey, v, distance3D(coords3D[nodeKey], coords3D[v]));
  edges.push([u, nodeKey], [nodeKey, v]);
};

const projectPointOnSegment2D = (px, pz, a, b) => {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const l2 = dx * dx + dz * dz;
  if (l2 === 0) {
    return { qx: a[0], qz: a[2], t: 0, dist2D: Math.hypot(px - a[0], pz - a[2]) };
  }
  const rawT = ((px - a[0]) * dx + (pz - a[2]) * dz) / l2;
  const t = Math.max(0, Math.min(1, rawT));
  const qx = a[0] + t * dx;
  const qz = a[2] + t * dz;
  return { qx, qz, t, dist2D: Math.hypot(px - qx, pz - qz) };
};

/**
 * Kiểm tra đoạn thẳng 2D (p1 -> p2) có đâm xuyên qua bất kỳ vật cản nào (mộ khác, tượng đài, nhà, cây) không.
 */
const segmentHitsObstacle = (x1, z1, x2, z2, obstacles, ignoreTargetX, ignoreTargetZ) => {
  const p1 = [x1, 0, z1];
  const p2 = [x2, 0, z2];

  for (const obs of obstacles) {
    // Bỏ qua chính ngôi mộ đích đang dẫn đường tới
    if (
      obs.type === 'GRAVE' &&
      Math.hypot(obs.x - ignoreTargetX, obs.z - ignoreTargetZ) < 0.85
    ) {
      continue;
    }

    const proj = projectPointOnSegment2D(obs.x, obs.z, p1, p2);
    if (proj.dist2D < obs.radius) {
      return true;
    }
  }
  return false;
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

const buildGraphFromPostgisRoads = (roadRows) => {
  const coords3D = {};
  const graph = {};
  const nodeKeys = [];
  const edges = [];
  const walkwayEndpoints = [];

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

  const mainRows = [];
  const walkRows = [];

  for (const row of roadRows) {
    const geom = row.geojson;
    if (!geom || geom.type !== 'LineString' || !Array.isArray(geom.coordinates)) continue;
    const isWalkway =
      Number(row.chieu_rong_duong) < 2.0 ||
      row.loai_duong === 'LOI_DI_BO' ||
      String(row.ma_tuyen_duong || '').startsWith('TD-WALK');
    if (isWalkway) walkRows.push(row);
    else mainRows.push(row);
  }

  const ingestLineRows = (rows, recordEndpoints = false) => {
    for (const row of rows) {
      const pts = row.geojson.coordinates;
      const lineKeys = [];
      let prevKey = null;

      for (const pt of pts) {
        const [x, z] = pt;
        if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
        const currKey = findOrCreateNode(x, z);
        lineKeys.push(currKey);
        if (prevKey && prevKey !== currKey) {
          const w = distance3D(coords3D[prevKey], coords3D[currKey]);
          addEdge(graph, prevKey, currKey, w);
          edges.push([prevKey, currKey]);
        }
        prevKey = currKey;
      }

      if (recordEndpoints && lineKeys.length >= 2) {
        walkwayEndpoints.push(lineKeys[0], lineKeys[lineKeys.length - 1]);
      }
    }
  };

  ingestLineRows(mainRows, false);

  for (const nodeKey of [...nodeKeys]) {
    const [px, , pz] = coords3D[nodeKey];
    for (const [u, v] of [...edges]) {
      if (u === nodeKey || v === nodeKey) continue;
      const proj = projectPointOnSegment2D(px, pz, coords3D[u], coords3D[v]);
      if (proj.dist2D <= JUNCTION_SNAP_TOLERANCE_M) {
        splitEdgeWithNode(coords3D, graph, edges, u, v, nodeKey);
      }
    }
  }

  ingestLineRows(walkRows, true);

  for (const endKey of walkwayEndpoints) {
    const [px, , pz] = coords3D[endKey];
    let bestSnap = null;

    for (const [u, v] of edges) {
      if (u === endKey || v === endKey) continue;
      const proj = projectPointOnSegment2D(px, pz, coords3D[u], coords3D[v]);
      if (proj.dist2D <= WALKWAY_ENDPOINT_SNAP_M && (!bestSnap || proj.dist2D < bestSnap.dist2D)) {
        bestSnap = { u, v, ...proj };
      }
    }

    if (bestSnap) {
      const snapKey = findOrCreateNode(bestSnap.qx, bestSnap.qz);
      if (snapKey !== endKey) {
        addEdge(graph, endKey, snapKey, distance3D(coords3D[endKey], coords3D[snapKey]));
        edges.push([endKey, snapKey]);
      }
      splitEdgeWithNode(coords3D, graph, edges, bestSnap.u, bestSnap.v, snapKey);
    }
  }

  return { coords3D, graph, nodeKeys, edges };
};

const findCandidateRoadProjections = (coords3D, edges, point, maxCandidates = 14) => {
  const px = point[0];
  const pz = point[2];
  const candidates = [];

  for (const [u, v] of edges) {
    const proj = projectPointOnSegment2D(px, pz, coords3D[u], coords3D[v]);
    candidates.push({ u, v, qx: proj.qx, qz: proj.qz, dist2D: proj.dist2D });
  }

  candidates.sort((a, b) => a.dist2D - b.dist2D);
  return candidates.slice(0, maxCandidates);
};

const attachProjectionNode = (coords3D, graph, edges, candidate, nodeKey) => {
  const qy = getTerrainHeight(candidate.qx, candidate.qz);
  const projCoord = [
    Number(candidate.qx.toFixed(2)),
    Number(qy.toFixed(2)),
    Number(candidate.qz.toFixed(2)),
  ];
  coords3D[nodeKey] = projCoord;
  graph[nodeKey] = [];
  splitEdgeWithNode(coords3D, graph, edges, candidate.u, candidate.v, nodeKey);
  return nodeKey;
};

const projectOntoNearestRoadEdge = (coords3D, graph, edges, point, nodeKey) => {
  const candidates = findCandidateRoadProjections(coords3D, edges, point, 1);
  if (candidates.length === 0) return null;
  return attachProjectionNode(coords3D, graph, edges, candidates[0], nodeKey);
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

const resolveMainGateStartPoint = (coords3D, nodeKeys) => {
  let gateCoord = null;
  for (const key of nodeKeys) {
    const pt = coords3D[key];
    if (Math.abs(pt[0]) <= 3.5 && (!gateCoord || pt[2] > gateCoord[2])) {
      gateCoord = pt;
    }
  }
  if (gateCoord) return [...gateCoord];
  const fallback = DEFAULT_NETWORK_NODES.GATE || [0, 62];
  return [fallback[0], Number(getTerrainHeight(fallback[0], fallback[1]).toFixed(2)), fallback[1]];
};

const densifyRoutePath = (routePath, stepMeters = 2.0) => {
  if (!Array.isArray(routePath) || routePath.length < 2) return routePath;
  const dense = [routePath[0]];

  for (let i = 0; i < routePath.length - 1; i++) {
    const [x1, , z1] = routePath[i];
    const [x2, , z2] = routePath[i + 1];
    const dist2D = Math.hypot(x2 - x1, z2 - z1);
    const steps = Math.max(1, Math.ceil(dist2D / stepMeters));

    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const x = x1 + (x2 - x1) * t;
      const z = z1 + (z2 - z1) * t;
      const y = getTerrainHeight(x, z);
      dense.push([Number(x.toFixed(2)), Number(y.toFixed(2)), Number(z.toFixed(2))]);
    }
  }

  return dense;
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
    spatialCache.set(cacheKey, rows, 30000);
    return rows;
  } catch {
    return [];
  }
};

/**
 * Nạp danh sách vật cản (tâm các lô mộ và công trình kiến trúc/tượng đài) để chặn đường đi xuyên vật thể.
 */
const loadCachedObstacles = async () => {
  const cacheKey = 'routing:obstacles:raw';
  const cached = spatialCache.get(cacheKey);
  if (cached) return cached;

  const obstacles = [
    // Tượng đài trung tâm tại (0, -21.5) với quảng trường bán kính 7.8m
    { type: 'MONUMENT', x: 0, z: -21.5, radius: 7.8 },
  ];

  try {
    const lotRes = await db.query(`
      SELECT ST_X(ST_Centroid(geom_3d)) AS x, ST_Y(ST_Centroid(geom_3d)) AS z
      FROM lo_dat
    `);
    for (const row of lotRes.rows || []) {
      const x = Number(row.x);
      const z = Number(row.z);
      if (Number.isFinite(x) && Number.isFinite(z)) {
        // Bán kính bảo vệ 1.05m quanh tâm mỗi mộ để ngăn đường nối băng ngang qua mộ hàng xóm
        obstacles.push({ type: 'GRAVE', x, z, radius: 1.05 });
      }
    }

    const infRes = await db.query(`
      SELECT ma_ha_tang, ST_X(ST_Centroid(geom_3d)) AS x, ST_Y(ST_Centroid(geom_3d)) AS z
      FROM ha_tang_ky_thuat
      WHERE ma_ha_tang LIKE 'HT-BLD%' OR ma_ha_tang LIKE 'HT-MON%' OR ma_ha_tang LIKE 'HT-BIGTREE%'
    `);
    for (const row of infRes.rows || []) {
      const id = String(row.ma_ha_tang || '');
      const x = Number(row.x);
      const z = Number(row.z);
      if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
      const radius = id.startsWith('HT-MON') ? 7.8 : id.startsWith('HT-BLD') ? 4.2 : 1.5;
      obstacles.push({ type: 'INFRA', x, z, radius });
    }
  } catch {
    // Vẫn giữ tối thiểu vật cản tượng đài trung tâm nếu lỗi truy vấn phụ
  }

  spatialCache.set(cacheKey, obstacles, 60000);
  return obstacles;
};

/**
 * Lùi điểm dừng cuối cùng ra mép trước ngôi mộ (cách tâm mộ 1.05m về phía đường đi) để ống dẫn không cắm vào bia mộ.
 */
const trimFinalApproachToGraveFront = (snapCoord, targetCoord) => {
  const dx = targetCoord[0] - snapCoord[0];
  const dz = targetCoord[2] - snapCoord[2];
  const dist = Math.hypot(dx, dz);
  if (dist <= 1.15) return snapCoord;

  const stopDist = dist - 1.05;
  const ratio = stopDist / dist;
  const fx = snapCoord[0] + dx * ratio;
  const fz = snapCoord[2] + dz * ratio;
  const fy = getTerrainHeight(fx, fz);
  return [Number(fx.toFixed(2)), Number(fy.toFixed(2)), Number(fz.toFixed(2))];
};

const calculateShortestRoute3D = async ({ targetX, targetZ, startNode = 'GATE' }) => {
  const tx = Number(targetX);
  const tz = Number(targetZ);

  if (!Number.isFinite(tx) || !Number.isFinite(tz)) {
    throw new AppError('Tọa độ đích (targetX, targetZ) không hợp lệ.', 400, 'INVALID_COORDINATES');
  }

  const targetPoint = [
    Number(tx.toFixed(2)),
    Number(getTerrainHeight(tx, tz).toFixed(2)),
    Number(tz.toFixed(2)),
  ];

  const [roadRows, obstacles] = await Promise.all([
    loadCachedRoadRows(),
    loadCachedObstacles(),
  ]);

  let routeSource = 'postgis_network';
  let result = null;
  let nearestNode = 'ACCESS_TARGET';
  let startPoint = null;

  if (roadRows.length > 0) {
    const { coords3D, graph, nodeKeys, edges } = buildGraphFromPostgisRoads(roadRows);
    if (nodeKeys.length >= 2 && edges.length >= 1) {
      if (startNode === 'GATE' || !DEFAULT_NETWORK_NODES[startNode]) {
        startPoint = resolveMainGateStartPoint(coords3D, nodeKeys);
      } else {
        const [sx, sz] = DEFAULT_NETWORK_NODES[startNode];
        startPoint = [sx, Number(getTerrainHeight(sx, sz).toFixed(2)), sz];
      }

      const startCandidates = findCandidateRoadProjections(coords3D, edges, startPoint, 4);
      const validStart =
        startCandidates.find(
          (c) => !segmentHitsObstacle(startPoint[0], startPoint[2], c.qx, c.qz, obstacles, tx, tz)
        ) || startCandidates[0];

      const startSnap = validStart
        ? attachProjectionNode(coords3D, graph, edges, validStart, 'ACCESS_START')
        : findNearestNodeKey(coords3D, nodeKeys, startPoint);

      coords3D.START = startPoint;
      addEdge(graph, 'START', startSnap, distance3D(startPoint, coords3D[startSnap]));

      // Lọc các ứng viên đường tiếp cận quanh mộ: ưu tiên tuyệt đối lối đi không xuyên qua mộ khác/tượng đài
      const targetCandidates = findCandidateRoadProjections(coords3D, edges, targetPoint, 14);
      const collisionFreeCandidates = targetCandidates.filter(
        (c) => !segmentHitsObstacle(c.qx, c.qz, tx, tz, obstacles, tx, tz)
      );
      const candidatePool =
        collisionFreeCandidates.length > 0 ? collisionFreeCandidates : targetCandidates;

      let bestScore = Infinity;

      for (let i = 0; i < candidatePool.length; i++) {
        const cand = candidatePool[i];
        if (cand.dist2D > 5.0 && result !== null) break;

        const trialCoords = { ...coords3D };
        const trialGraph = Object.fromEntries(
          Object.entries(graph).map(([k, list]) => [k, list.map((e) => ({ ...e }))])
        );
        const trialEdges = edges.map((e) => [...e]);

        const snapKey = `ACCESS_TARGET_${i}`;
        attachProjectionNode(trialCoords, trialGraph, trialEdges, cand, snapKey);

        const frontStop = trimFinalApproachToGraveFront(trialCoords[snapKey], targetPoint);
        trialCoords.TARGET = frontStop;

        const walkStepDist = distance3D(trialCoords[snapKey], frontStop);
        const offRoadPenalty = walkStepDist > 1.8 ? (walkStepDist - 1.8) * 18 : 0;
        addEdge(trialGraph, snapKey, 'TARGET', walkStepDist + offRoadPenalty);

        const attempt = runDijkstra(trialGraph, trialCoords, 'START', 'TARGET');
        if (attempt && attempt.distanceMeters < bestScore) {
          bestScore = attempt.distanceMeters;
          result = {
            ...attempt,
            distanceMeters: Number((attempt.distanceMeters - offRoadPenalty).toFixed(2)),
          };
          nearestNode = snapKey;
        }
      }
    }
  }

  if (!result) {
    routeSource = 'default_graph';
    const { coords3D, graph, nodeKeys } = buildFallbackGraph();
    const startKey = coords3D[startNode] ? startNode : 'GATE';
    startPoint = coords3D[startKey];
    nearestNode = findNearestNodeKey(coords3D, nodeKeys, targetPoint);
    coords3D.TARGET = trimFinalApproachToGraveFront(coords3D[nearestNode], targetPoint);
    addEdge(graph, nearestNode, 'TARGET', distance3D(coords3D[nearestNode], coords3D.TARGET));
    result = runDijkstra(graph, coords3D, startKey, 'TARGET');
  }

  const elevationGain = Number((targetPoint[1] - startPoint[1]).toFixed(2));
  const estimatedMinutes = Math.max(1, Math.ceil(result.distanceMeters / 60));

  return {
    startNode,
    routeSource,
    nearestNetworkNode: nearestNode,
    routeNodes: result.pathKeys,
    routePath: densifyRoutePath(result.routePath, 2.0),
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
  projectOntoNearestRoadEdge,
  runDijkstra,
};