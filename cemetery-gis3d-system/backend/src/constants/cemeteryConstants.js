// Nhãn hiển thị tiếng Việt (Frontend)
const GRAVE_STATUS = Object.freeze({
  EMPTY: 'Trống',
  OCCUPIED: 'Đã an táng',
  RESERVED: 'Đã đặt trước',
});

// Mã trạng thái lưu trong PostgreSQL / Supabase (CHECK constraint)
const DB_GRAVE_STATUS = Object.freeze({
  EMPTY: 'TRONG',
  OCCUPIED: 'DA_AN_TANG',
  RESERVED: 'DA_DAT_TRUOC',
});

const DB_TO_UI_STATUS = Object.freeze({
  TRONG: GRAVE_STATUS.EMPTY,
  DA_AN_TANG: GRAVE_STATUS.OCCUPIED,
  DA_DAT_TRUOC: GRAVE_STATUS.RESERVED,
  Trống: GRAVE_STATUS.EMPTY,
  'Đã an táng': GRAVE_STATUS.OCCUPIED,
  'Đã đặt trước': GRAVE_STATUS.RESERVED,
});

const UI_TO_DB_STATUS = Object.freeze({
  Trống: DB_GRAVE_STATUS.EMPTY,
  'Đã an táng': DB_GRAVE_STATUS.OCCUPIED,
  'Đã đặt trước': DB_GRAVE_STATUS.RESERVED,
  TRONG: DB_GRAVE_STATUS.EMPTY,
  DA_AN_TANG: DB_GRAVE_STATUS.OCCUPIED,
  DA_DAT_TRUOC: DB_GRAVE_STATUS.RESERVED,
});

const VALID_GRAVE_STATUSES = Object.freeze([
  GRAVE_STATUS.EMPTY,
  GRAVE_STATUS.OCCUPIED,
  GRAVE_STATUS.RESERVED,
  DB_GRAVE_STATUS.EMPTY,
  DB_GRAVE_STATUS.OCCUPIED,
  DB_GRAVE_STATUS.RESERVED,
]);

// Ánh xạ mã phân khu DB (PK-A/B/C) <-> nhãn phân khu Frontend (Khu A/B/C)
const ZONE_CODE_TO_UI_LABEL = Object.freeze({
  'PK-A': 'Khu A',
  'PK-B': 'Khu B',
  'PK-C': 'Khu C',
});

const UI_LABEL_TO_ZONE_CODE = Object.freeze({
  'Khu A': 'PK-A',
  'Khu B': 'PK-B',
  'Khu C': 'PK-C',
  'PK-A': 'PK-A',
  'PK-B': 'PK-B',
  'PK-C': 'PK-C',
});

const TOPOLOGY_RELATION_TYPES = Object.freeze({
  CONTAINS_IN_ZONE: 'CHUA_TRONG_KHU',
  ADJACENT_LOT: 'KE_NHAU_LODAT',
  ADJACENT_INFRA: 'KE_NHAU_HATANG',
  ADJACENT_ROAD: 'KE_NHAU_DUONG',
});

// Hệ tọa độ chuẩn trên Supabase (WGS84 4326) và hệ chiếu mét Web Mercator (3857)
const SRID_WGS84 = 4326;
const SRID_WEB_MERCATOR = 3857;

// Tâm nghĩa trang gốc dùng để quy đổi WGS84 (4326) -> tọa độ Cartesian mét [x, y, z] cho Three.js
const CEMETERY_ORIGIN_WGS84 = Object.freeze({
  lon: 106.7806,
  lat: 10.8705,
});

const DEFAULT_SUDM_SURFACES = Object.freeze([
  { id: 'F_GROUND', surfaceType: 'GroundSurface', label: 'Móng bệ bê tông tiếp đất', areaM2: 3.52 },
  { id: 'F_WALL', surfaceType: 'WallSurface', label: '4 Mặt tường bao thân mộ', areaM2: 4.8 },
  { id: 'F_ROOF', surfaceType: 'RoofSurface', label: 'Nắp mộ & Mặt bia đá', areaM2: 2.95 },
]);

// Mạng lưới nút giao thông chuẩn nội bộ (đồng bộ tọa độ không gian 3D)
const DEFAULT_NETWORK_NODES = Object.freeze({
  GATE: [0, 50],
  HALL_MID: [0, 42],
  GATE_2: [0, 22.5],
  RING_SOUTH: [0, 7],
  MONUMENT: [0, -21.5],
  RING_WEST: [-25, -18],
  RING_EAST: [25, -18],
  RING_NORTH: [0, -43],
});

const DEFAULT_NETWORK_EDGES = Object.freeze([
  ['GATE', 'HALL_MID'],
  ['HALL_MID', 'GATE_2'],
  ['GATE_2', 'RING_SOUTH'],
  ['RING_SOUTH', 'MONUMENT'],
  ['RING_SOUTH', 'RING_WEST'],
  ['RING_SOUTH', 'RING_EAST'],
  ['RING_WEST', 'MONUMENT'],
  ['RING_EAST', 'MONUMENT'],
  ['RING_WEST', 'RING_NORTH'],
  ['RING_EAST', 'RING_NORTH'],
  ['MONUMENT', 'RING_NORTH'],
]);

module.exports = {
  GRAVE_STATUS,
  DB_GRAVE_STATUS,
  DB_TO_UI_STATUS,
  UI_TO_DB_STATUS,
  VALID_GRAVE_STATUSES,
  ZONE_CODE_TO_UI_LABEL,
  UI_LABEL_TO_ZONE_CODE,
  TOPOLOGY_RELATION_TYPES,
  SRID_WGS84,
  SRID_WEB_MERCATOR,
  CEMETERY_ORIGIN_WGS84,
  DEFAULT_SUDM_SURFACES,
  DEFAULT_NETWORK_NODES,
  DEFAULT_NETWORK_EDGES,
};
