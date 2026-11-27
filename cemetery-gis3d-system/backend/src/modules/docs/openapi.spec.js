const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'WebGIS 3D — Quy hoạch Nghĩa trang Đô thị (IE402.R11)',
    version: '2.6.0',
    description:
      'REST API Backend 3-tier Modular (PostgreSQL + PostGIS 3D) hỗ trợ bố cục vòng tròn đồng tâm 240 mộ hướng tâm, 2 cổng, hàng rào/cây xanh, lọc BBOX/LOD, kiểm tra Topology 3D, tính diện tích & sức chứa còn lại, và định tuyến Dijkstra 3D động.',
  },
  servers: [{ url: `http://localhost:${process.env.PORT || 5001}`, description: 'Local Development Server' }],
  tags: [
    { name: 'Health', description: 'Kiểm tra trạng thái máy chủ và PostGIS' },
    { name: 'Graves', description: 'Quản lý lô mộ 3D, lọc BBOX/LOD, cấp phát và quy hoạch mới' },
    { name: 'Zones', description: 'Phân khu, tính diện tích & sức chứa còn lại, hạ tầng, giao thông' },
    { name: 'Topology', description: 'Kiểm tra Topology 3D (ST_Contains, ST_3DDistance, ST_Buffer)' },
    { name: 'Routing', description: 'Định tuyến đường đi ngắn nhất 3D (Dijkstra động)' },
  ],
  paths: {
    '/health': {
      get: { tags: ['Health'], summary: 'Liveness probe', responses: { 200: { description: 'OK' } } },
    },
    '/health/ready': {
      get: { tags: ['Health'], summary: 'Readiness probe (PostgreSQL + PostGIS)', responses: { 200: { description: 'READY' } } },
    },
    '/api/graves': {
      get: {
        tags: ['Graves'],
        summary: 'Danh sách lô mộ 3D (hỗ trợ lọc phân khu, trạng thái, BBOX, LOD 1-3, GeoJSON)',
        parameters: [
          { name: 'ma_phan_khu', in: 'query', schema: { type: 'string', example: 'Khu A' } },
          { name: 'trang_thai', in: 'query', schema: { type: 'string', enum: ['Trống', 'Đã an táng', 'Đã đặt trước'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'bbox', in: 'query', schema: { type: 'string', example: '-45,-62,45,25' } },
          { name: 'lod', in: 'query', schema: { type: 'integer', enum: [1, 2, 3], default: 3 } },
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'geojson'] } },
        ],
        responses: { 200: { description: 'Danh sách lô mộ 3D' } },
      },
      post: {
        tags: ['Graves'],
        summary: 'Quy hoạch tạo lô mộ 3D mới (tự động kiểm tra cổng Topology PostGIS trước khi lưu)',
        responses: { 201: { description: 'Created' }, 422: { description: 'Vi phạm Topology 3D' } },
      },
    },
    '/api/graves/{ma_lo_dat}': {
      get: {
        tags: ['Graves'],
        summary: 'Chi tiết 1 lô mộ 3D kèm thể tích khối 3D, SUDM và hồ sơ người mất',
        parameters: [{ name: 'ma_lo_dat', in: 'path', required: true, schema: { type: 'string', example: 'A-001' } }],
        responses: { 200: { description: 'Chi tiết lô mộ' }, 404: { description: 'Không tìm thấy' } },
      },
      put: {
        tags: ['Graves'],
        summary: 'Cập nhật trạng thái vòng đời lô mộ (xác nhận an táng / thu hồi trả trống)',
        parameters: [{ name: 'ma_lo_dat', in: 'path', required: true, schema: { type: 'string', example: 'A-001' } }],
        responses: { 200: { description: 'Cập nhật thành công' } },
      },
    },
    '/api/graves/allocate': {
      post: { tags: ['Graves'], summary: 'Cấp phát / đặt trước lô mộ trống', responses: { 201: { description: 'Created' } } },
    },
    '/api/graves/export/csv': {
      get: { tags: ['Graves'], summary: 'Xuất báo cáo quy hoạch CSV có UTF-8 BOM', responses: { 200: { description: 'CSV' } } },
    },
    '/api/zones': {
      get: { tags: ['Zones'], summary: 'Danh sách phân khu', responses: { 200: { description: 'OK' } } },
    },
    '/api/zones/capacity': {
      get: { tags: ['Zones'], summary: 'Phân tích diện tích & sức chứa còn lại toàn nghĩa trang', responses: { 200: { description: 'OK' } } },
    },
    '/api/zones/{ma_phan_khu}/capacity': {
      get: {
        tags: ['Zones'],
        summary: 'Phân tích diện tích & sức chứa còn lại theo phân khu',
        parameters: [{ name: 'ma_phan_khu', in: 'path', required: true, schema: { type: 'string', example: 'PK-A' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/zones/infrastructure': {
      get: { tags: ['Zones'], summary: 'Danh sách công trình hạ tầng, 2 cổng, hàng rào & cây xanh', responses: { 200: { description: 'OK' } } },
    },
    '/api/zones/roads': {
      get: { tags: ['Zones'], summary: 'Danh sách tuyến giao thông nội bộ 3D (vành đai + xuyên tâm)', responses: { 200: { description: 'OK' } } },
    },
    '/api/topology/graves/{ma_lo_dat}': {
      get: {
        tags: ['Topology'],
        summary: 'Kiểm tra Topology 3D chi tiết cho 1 lô mộ',
        parameters: [
          { name: 'ma_lo_dat', in: 'path', required: true, schema: { type: 'string', example: 'A-001' } },
          { name: 'radius', in: 'query', schema: { type: 'number', default: 10 } },
        ],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/topology/audit': {
      get: { tags: ['Topology'], summary: 'Kiểm toán Topology toàn khu nghĩa trang', responses: { 200: { description: 'OK' } } },
    },
    '/api/topology/relations': {
      get: { tags: ['Topology'], summary: 'Danh sách quan hệ lưu trong bảng quan_he_topology', responses: { 200: { description: 'OK' } } },
    },
    '/api/routing/shortest-path': {
      get: {
        tags: ['Routing'],
        summary: 'Tìm đường đi ngắn nhất 3D (Dijkstra động từ mạng đường PostGIS)',
        parameters: [
          { name: 'targetX', in: 'query', required: true, schema: { type: 'number', example: -20 } },
          { name: 'targetZ', in: 'query', required: true, schema: { type: 'number', example: -18 } },
          { name: 'startNode', in: 'query', schema: { type: 'string', default: 'GATE' } },
        ],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/routing/network': {
      get: { tags: ['Routing'], summary: 'Mạng lưới đường nội bộ 3D dạng GeoJSON', responses: { 200: { description: 'OK' } } },
    },
  },
};

module.exports = openApiSpec;
