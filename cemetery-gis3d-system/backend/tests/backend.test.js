const test = require('node:test');
const assert = require('node:assert/strict');

const { MemoryLruCache } = require('../src/utils/memoryCache');
const { getTerrainHeight, distance3D, buildLotPolygonZWkt } = require('../src/utils/terrainMath');
const { mapPgError } = require('../src/utils/pgErrorMapper');
const { toGeoJsonFeatureCollection } = require('../src/utils/apiResponse');
const {
  DB_TO_UI_STATUS,
  UI_TO_DB_STATUS,
  ZONE_CODE_TO_UI_LABEL,
  UI_LABEL_TO_ZONE_CODE,
} = require('../src/constants/cemeteryConstants');
const openApiSpec = require('../src/modules/docs/openapi.spec');

test('MemoryLruCache: lưu trữ, đọc, đẩy LRU và xóa theo tiền tố', () => {
  const cache = new MemoryLruCache({ maxEntries: 2, defaultTtlMs: 5000 });
  cache.set('zones:a', { count: 1 });
  cache.set('zones:b', { count: 2 });
  assert.deepEqual(cache.get('zones:a'), { count: 1 });

  cache.set('topology:audit', { ok: true });
  assert.equal(cache.get('zones:b'), undefined);
  assert.deepEqual(cache.get('zones:a'), { count: 1 });

  const removed = cache.invalidatePrefix('zones:');
  assert.equal(removed, 1);
  assert.equal(cache.get('zones:a'), undefined);
  assert.deepEqual(cache.get('topology:audit'), { ok: true });
});

test('terrainMath: tính cao độ TIN/DEM, khoảng cách 3D và sinh WKT POLYGON Z', () => {
  assert.equal(Number(getTerrainHeight(0, 0).toFixed(2)), 1.5);
  assert.equal(distance3D([0, 0, 0], [3, 4, 12]), 13);

  const wkt = buildLotPolygonZWkt(-17, -10, 1.35, 2.2, 1.6);
  assert.ok(wkt.startsWith('POLYGON Z(('));
  assert.ok(wkt.includes('-18.1 -10.8 1.35'));
  assert.ok(wkt.endsWith('-18.1 -10.8 1.35))'));
});

test('cemeteryConstants: ánh xạ 2 chiều trạng thái & phân khu Supabase <-> Frontend', () => {
  assert.equal(DB_TO_UI_STATUS.DA_AN_TANG, 'Đã an táng');
  assert.equal(DB_TO_UI_STATUS.DA_DAT_TRUOC, 'Đã đặt trước');
  assert.equal(DB_TO_UI_STATUS.TRONG, 'Trống');
  assert.equal(UI_TO_DB_STATUS['Đã an táng'], 'DA_AN_TANG');
  assert.equal(UI_TO_DB_STATUS['Trống'], 'TRONG');
  assert.equal(ZONE_CODE_TO_UI_LABEL['PK-A'], 'Khu A');
  assert.equal(UI_LABEL_TO_ZONE_CODE['Khu B'], 'PK-B');
});

test('pgErrorMapper: ánh xạ mã lỗi PostgreSQL sang AppError đúng HTTP status', () => {
  const dup = mapPgError({ code: '23505', detail: 'Key exists' });
  assert.equal(dup.statusCode, 409);
  assert.equal(dup.code, 'DB_DUPLICATE_KEY');

  const fk = mapPgError({ code: '23503' });
  assert.equal(fk.statusCode, 400);
  assert.equal(fk.code, 'DB_FOREIGN_KEY_VIOLATION');
});

test('apiResponse: chuyển đổi bản ghi sang chuẩn OGC GeoJSON FeatureCollection', () => {
  const fc = toGeoJsonFeatureCollection(
    [{ ma_lo_dat: 'LD-A01', trang_thai: 'Trống', geojson: { type: 'Point', coordinates: [106.78, 10.87, 12.5] } }],
    'geojson',
    'ma_lo_dat'
  );
  assert.equal(fc.type, 'FeatureCollection');
  assert.equal(fc.features.length, 1);
  assert.equal(fc.features[0].id, 'LD-A01');
  assert.equal(fc.features[0].properties.trang_thai, 'Trống');
});

test('openApiSpec: đặc tả OpenAPI 3.0.3 đầy đủ các nhóm endpoint cốt lõi', () => {
  assert.equal(openApiSpec.openapi, '3.0.3');
  assert.ok(openApiSpec.paths['/api/graves']);
  assert.ok(openApiSpec.paths['/api/graves'].post);
  assert.ok(openApiSpec.paths['/api/zones/capacity']);
  assert.ok(openApiSpec.paths['/api/topology/graves/{ma_lo_dat}']);
  assert.ok(openApiSpec.paths['/api/routing/shortest-path']);
});
