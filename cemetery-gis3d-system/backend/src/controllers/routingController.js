const getTerrainHeight = (x, z) => {
  return Math.sin(x * 0.05) * 1.8 + Math.cos(z * 0.04) * 1.5 + (x * 0.02 + z * 0.015) * 1.5;
};

// Mạng lưới các nút giao thông nội bộ (Nodes)
const NETWORK_NODES = {
  GATE: [0, 42],          // Cổng chính
  PLAZA_SOUTH: [0, 20],   // Quảng trường Nam
  JUNCTION_B: [0, 5],     // Ngã tư Khu B (Trung tâm)
  JUNCTION_AC: [0, -14],  // Ngã ba nối Khu A & Khu C
  WEST_A1: [-17, -14],    // Nhánh Khu A
  EAST_C1: [18, -10],     // Nhánh Khu C
  MONUMENT: [0, -25],     // Đài tưởng niệm
};

// Các đoạn đường nối (Edges)
const NETWORK_EDGES = [
  ['GATE', 'PLAZA_SOUTH'],
  ['PLAZA_SOUTH', 'JUNCTION_B'],
  ['JUNCTION_B', 'JUNCTION_AC'],
  ['JUNCTION_AC', 'WEST_A1'],
  ['JUNCTION_AC', 'EAST_C1'],
  ['JUNCTION_AC', 'MONUMENT'],
];

const dist3D = (p1, p2) =>
  Math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2 + (p2[2] - p1[2]) ** 2);

exports.findShortestRoute3D = async (req, res) => {
  const { targetX, targetZ, startNode = 'GATE' } = req.query;
  const tx = parseFloat(targetX);
  const tz = parseFloat(targetZ);

  if (isNaN(tx) || isNaN(tz)) {
    return res.status(400).json({ error: 'Thiếu tọa độ đích (targetX, targetZ)' });
  }

  // Tạo tọa độ 3D đầy đủ cho các nút
  const coords3D = {};
  Object.entries(NETWORK_NODES).forEach(([key, [x, z]]) => {
    coords3D[key] = [x, getTerrainHeight(x, z), z];
  });

  // Thêm nút đích tạm thời nối vào nút mạng lưới gần nhất
  const targetPoint = [tx, getTerrainHeight(tx, tz), tz];
  coords3D['TARGET'] = targetPoint;

  let nearestNode = 'JUNCTION_B';
  let minSnapDist = Infinity;
  Object.keys(NETWORK_NODES).forEach((key) => {
    const d = dist3D(coords3D[key], targetPoint);
    if (d < minSnapDist) {
      minSnapDist = d;
      nearestNode = key;
    }
  });

  // Xây dựng danh sách kề
  const graph = {};
  Object.keys(coords3D).forEach((k) => (graph[k] = []));
  [...NETWORK_EDGES, [nearestNode, 'TARGET']].forEach(([u, v]) => {
    const w = dist3D(coords3D[u], coords3D[v]);
    graph[u].push({ node: v, weight: w });
    graph[v].push({ node: u, weight: w });
  });

  // Thuật toán Dijkstra
  const distances = {};
  const prev = {};
  const unvisited = new Set(Object.keys(coords3D));
  Object.keys(coords3D).forEach((k) => (distances[k] = Infinity));
  distances[startNode] = 0;

  while (unvisited.size > 0) {
    let curr = null;
    unvisited.forEach((node) => {
      if (curr === null || distances[node] < distances[curr]) curr = node;
    });
    if (curr === null || curr === 'TARGET') break;
    unvisited.delete(curr);

    graph[curr].forEach(({ node, weight }) => {
      if (unvisited.has(node)) {
        const alt = distances[curr] + weight;
        if (alt < distances[node]) {
          distances[node] = alt;
          prev[node] = curr;
        }
      }
    });
  }

  // Truy vết đường đi
  const pathKeys = [];
  let u = 'TARGET';
  while (u) {
    pathKeys.unshift(u);
    u = prev[u];
  }

  const routePath = pathKeys.map((k) => coords3D[k]);
  const elevationGain = Number((targetPoint[1] - coords3D[startNode][1]).toFixed(2));

  res.json({
    routePath,
    distanceMeters: Number(distances['TARGET'].toFixed(2)),
    elevationGain,
    estimatedMinutes: Math.max(1, Math.ceil(distances['TARGET'] / 60)),
  });
};