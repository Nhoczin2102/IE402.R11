const {
  DEFAULT_NETWORK_NODES,
  DEFAULT_NETWORK_EDGES,
} = require('../../constants/cemeteryConstants');
const { getTerrainHeight, distance3D } = require('../../utils/terrainMath');
const routingRepository = require('./routing.repository');

/**
 * Tính đường đi ngắn nhất trong không gian 3D bằng thuật toán Dijkstra
 * từ nút xuất phát (mặc định: GATE) tới tọa độ đích (targetX, targetZ).
 */
const calculateShortestRoute3D = async ({ targetX, targetZ, startNode = 'GATE' }) => {
  const coords3D = {};
  Object.entries(DEFAULT_NETWORK_NODES).forEach(([key, [x, z]]) => {
    coords3D[key] = [x, getTerrainHeight(x, z), z];
  });

  const targetPoint = [targetX, getTerrainHeight(targetX, targetZ), targetZ];
  coords3D.TARGET = targetPoint;

  // Bám (snap) tọa độ đích vào nút mạng lưới gần nhất trong không gian 3D
  let nearestNode = 'JUNCTION_B';
  let minSnapDist = Infinity;

  Object.keys(DEFAULT_NETWORK_NODES).forEach((key) => {
    const d = distance3D(coords3D[key], targetPoint);
    if (d < minSnapDist) {
      minSnapDist = d;
      nearestNode = key;
    }
  });

  // Dựng đồ thị có trọng số khoảng cách 3D
  const graph = {};
  Object.keys(coords3D).forEach((k) => {
    graph[k] = [];
  });

  [...DEFAULT_NETWORK_EDGES, [nearestNode, 'TARGET']].forEach(([u, v]) => {
    const weight = distance3D(coords3D[u], coords3D[v]);
    graph[u].push({ node: v, weight });
    graph[v].push({ node: u, weight });
  });

  // Thuật toán Dijkstra
  const distances = {};
  const previous = {};
  const unvisited = new Set(Object.keys(coords3D));

  Object.keys(coords3D).forEach((k) => {
    distances[k] = Infinity;
  });
  distances[startNode] = 0;

  while (unvisited.size > 0) {
    let current = null;
    unvisited.forEach((node) => {
      if (current === null || distances[node] < distances[current]) {
        current = node;
      }
    });

    if (current === null || current === 'TARGET' || distances[current] === Infinity) {
      break;
    }

    unvisited.delete(current);

    for (const { node, weight } of graph[current]) {
      if (!unvisited.has(node)) continue;
      const alt = distances[current] + weight;
      if (alt < distances[node]) {
        distances[node] = alt;
        previous[node] = current;
      }
    }
  }

  // Truy vết lộ trình tối ưu
  const pathKeys = [];
  let cursor = 'TARGET';
  while (cursor) {
    pathKeys.unshift(cursor);
    cursor = previous[cursor];
  }

  const routePath = pathKeys.map((k) => coords3D[k]);
  const distanceMeters = Number(distances.TARGET.toFixed(2));
  const elevationGain = Number((targetPoint[1] - coords3D[startNode][1]).toFixed(2));
  const estimatedMinutes = Math.max(1, Math.ceil(distanceMeters / 60));

  return {
    startNode,
    nearestNetworkNode: nearestNode,
    routeNodes: pathKeys,
    routePath,
    distanceMeters,
    elevationGain,
    estimatedMinutes,
  };
};

const getRoadNetworkGeoJson = async () => {
  const rows = await routingRepository.findRoadNetworkLines();
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
};
