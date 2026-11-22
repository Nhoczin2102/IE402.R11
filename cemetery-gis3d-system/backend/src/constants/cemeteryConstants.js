const GRAVE_STATUS = Object.freeze({
  EMPTY: 'Trống',
  OCCUPIED: 'Đã an táng',
  RESERVED: 'Đã đặt trước',
});

const VALID_GRAVE_STATUSES = Object.freeze(Object.values(GRAVE_STATUS));

const TOPOLOGY_RELATION_TYPES = Object.freeze({
  CONTAINS: 'CONTAINS',
  WITHIN: 'WITHIN',
  ADJACENT: 'ADJACENT',
  TOUCHES: 'TOUCHES',
  OVERLAPS: 'OVERLAPS',
  BUFFER_VIOLATION: 'BUFFER_VIOLATION',
  ROAD_ACCESS: 'ROAD_ACCESS',
});

const SRID_VN2000_METERS = 3405;

// Mạng lưới nút giao thông chuẩn nội bộ (đồng bộ tọa độ không gian 3D)
const DEFAULT_NETWORK_NODES = Object.freeze({
  GATE: [0, 42],
  PLAZA_SOUTH: [0, 20],
  JUNCTION_B: [0, 5],
  JUNCTION_AC: [0, -14],
  WEST_A1: [-17, -14],
  EAST_C1: [18, -10],
  MONUMENT: [0, -25],
});

const DEFAULT_NETWORK_EDGES = Object.freeze([
  ['GATE', 'PLAZA_SOUTH'],
  ['PLAZA_SOUTH', 'JUNCTION_B'],
  ['JUNCTION_B', 'JUNCTION_AC'],
  ['JUNCTION_AC', 'WEST_A1'],
  ['JUNCTION_AC', 'EAST_C1'],
  ['JUNCTION_AC', 'MONUMENT'],
]);

module.exports = {
  GRAVE_STATUS,
  VALID_GRAVE_STATUSES,
  TOPOLOGY_RELATION_TYPES,
  SRID_VN2000_METERS,
  DEFAULT_NETWORK_NODES,
  DEFAULT_NETWORK_EDGES,
};
