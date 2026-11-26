const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}`;

test('GET /health/ready — xác nhận PostgreSQL & PostGIS đang hoạt động', async () => {
  const res = await fetch(`${BASE_URL}/health/ready`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'READY');
  assert.equal(body.database.connected, true);
  assert.ok(body.database.postgisVersion);
});

test('GET /openapi.json & /docs — tài liệu API Scalar hoạt động', async () => {
  const specRes = await fetch(`${BASE_URL}/openapi.json`);
  assert.equal(specRes.status, 200);
  const spec = await specRes.json();
  assert.equal(spec.openapi, '3.0.3');

  const docsRes = await fetch(`${BASE_URL}/docs`);
  assert.equal(docsRes.status, 200);
  assert.ok((await docsRes.text()).includes('api-reference'));
});

test('GET /api/graves — trả danh sách lô mộ 3D, hỗ trợ LOD=1 và GeoJSON', async () => {
  const res = await fetch(`${BASE_URL}/api/graves`);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('x-request-id'));
  const graves = await res.json();
  assert.ok(Array.isArray(graves) && graves.length > 0);
  assert.equal(graves[0].position.length, 3);

  const lod1Res = await fetch(`${BASE_URL}/api/graves?lod=1`);
  assert.equal(lod1Res.status, 200);

  const geoRes = await fetch(`${BASE_URL}/api/graves?format=geojson`);
  assert.equal(geoRes.status, 200);
  const fc = await geoRes.json();
  assert.equal(fc.type, 'FeatureCollection');
});

test('GET /api/zones/capacity, infrastructure, roads — trả 200 và hỗ trợ X-Cache', async () => {
  const res1 = await fetch(`${BASE_URL}/api/zones/capacity`);
  assert.equal(res1.status, 200);
  const body1 = await res1.json();
  assert.equal(body1.success, true);
  assert.ok(Array.isArray(body1.data.zones));

  const res2 = await fetch(`${BASE_URL}/api/zones/capacity`);
  assert.equal(res2.status, 200);
  assert.equal(res2.headers.get('x-cache'), 'HIT');

  const infraRes = await fetch(`${BASE_URL}/api/zones/infrastructure`);
  assert.equal(infraRes.status, 200);
  const roadRes = await fetch(`${BASE_URL}/api/zones/roads`);
  assert.equal(roadRes.status, 200);
});

test('GET /api/topology/audit & /api/routing/shortest-path — phân tích không gian 3D', async () => {
  const auditRes = await fetch(`${BASE_URL}/api/topology/audit`);
  assert.equal(auditRes.status, 200);
  const audit = await auditRes.json();
  assert.equal(audit.success, true);

  const routeRes = await fetch(`${BASE_URL}/api/routing/shortest-path?targetX=-17&targetZ=-14`);
  assert.equal(routeRes.status, 200);
  const route = await routeRes.json();
  assert.ok(Array.isArray(route.routePath) && route.routePath.length >= 2);
  assert.ok(route.distanceMeters > 0);
});

test('GET /api/graves/export/csv — xuất báo cáo CSV có UTF-8 BOM', async () => {
  const res = await fetch(`${BASE_URL}/api/graves/export/csv`);
  assert.equal(res.status, 200);
  assert.ok((res.headers.get('content-type') || '').includes('text/csv'));
  const text = await res.text();
  assert.ok(text.includes('MaLoDat'));
});
