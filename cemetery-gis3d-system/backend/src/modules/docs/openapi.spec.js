const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'WebGIS 3D — Quy hoạch Nghĩa trang Đô thị (IE402.R11)',
    version: '2.4.0',
    description:
      'REST API Backend 3-tier Modular (PostgreSQL + PostGIS 3D, EPSG:3405) hỗ trợ quản lý lô mộ theo khu/lô, BBOX/LOD, kiểm tra Topology 3D (chứa trong / kề nhau / vùng đệm), tính diện tích & sức chứa còn lại, và định tuyến Dijkstra 3D.',
  },
  servers: [{ url: `http://localhost:${process.env.PORT || 5001}`, description: 'Local Development Server' }],
  tags: [
    { name: 'Health', description: 'Kiểm tra trạng thái máy chủ và PostGIS' },
    { name: 'Graves', description: 'Quản lý lô mộ 3D, lọc BBOX/LOD, cấp phát và quy hoạch mới' },
    { name: 'Zones', description: 'Phân khu, tính diện tích & sức chứa còn lại, hạ tầng, giao thông' },
    { name: 'Topology', description: 'Kiểm tra Topology 3D (ST_Contains, ST_3DDistance, ST_Buffer)' },
    { name: 'Routing', description: 'Định tuyến đường đi ngắn nhất 3D (Dijkstra)' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Liveness probe',
        responses: { 200: { description: 'Backend đang hoạt động' } },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness probe (kiểm tra PostgreSQL + PostGIS)',
        responses: { 200: { description: 'CSDL và PostGIS sẵn sàng' } },
      },
    },
    '/api/graves': {
      get: {
        tags: ['Graves'],
        summary: 'Danh sách lô mộ 3D (hỗ trợ lọc phân khu, trạng thái, BBOX, LOD 1-3, GeoJSON)',
        parameters: [
          { name: 'ma_phan_khu', in: 'query', schema: { type: 'string', example: 'Khu A' } },
          { name: 'trang_thai', in: 'query', schema: { type: 'string', enum: ['Trống', 'Đã an táng', 'Đã đặt trước'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'bbox', in: 'query', description: 'Khung bao không gian: minX,minZ,maxX,maxZ', schema: { type: 'string', example: '-30,-24,-6,-4' } },
          { name: 'lod', in: 'query', description: 'Mức độ chi tiết CityGML (1: khối thô, 2: có SUDM, 3: đầy đủ)', schema: { type: 'integer', enum: [1, 2, 3], default: 3 } },
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'geojson'] } },
        ],
        responses: { 200: { description: 'Danh sách lô mộ 3D hoặc GeoJSON FeatureCollection' } },
      },
      post: {
        tags: ['Graves'],
        summary: 'Quy hoạch tạo lô mộ 3D mới (tự động kiểm tra cổng Topology PostGIS trước khi lưu)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ma_lo_dat', 'ma_phan_khu', 'ma_mau_mo', 'vi_tri_hang_o', 'toa_do_x', 'toa_do_z'],
                properties: {
                  ma_lo_dat: { type: 'string', example: 'A-05' },
                  ma_phan_khu: { type: 'string', example: 'Khu A' },
                  ma_mau_mo: { type: 'string', example: 'MM01' },
                  vi_tri_hang_o: { type: 'string', example: 'Hàng 2 - Ô 2' },
                  toa_do_x: { type: 'number', example: -17 },
                  toa_do_z: { type: 'number', example: -10 },
                  goc_xoay_z: { type: 'number', example: 0 },
                  do_sau_huyet: { type: 'number', example: 2.0 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Tạo lô mộ thành công và đã ghi nhận quan hệ Topology' },
          422: { description: 'Vi phạm quy tắc Topology 3D (ngoài khu, chồng lấp, khoảng cách hoặc vùng đệm)' },
        },
      },
    },
    '/api/graves/{ma_lo_dat}': {
      get: {
        tags: ['Graves'],
        summary: 'Chi tiết 1 lô mộ 3D kèm thể tích khối 3D, SUDM và hồ sơ người mất',
        parameters: [{ name: 'ma_lo_dat', in: 'path', required: true, schema: { type: 'string', example: 'A-01' } }],
        responses: { 200: { description: 'Thông tin chi tiết lô mộ' }, 404: { description: 'Không tìm thấy lô mộ' } },
      },
      put: {
        tags: ['Graves'],
        summary: 'Cập nhật trạng thái vòng đời lô mộ (xác nhận an táng / thu hồi trả trống)',
        parameters: [{ name: 'ma_lo_dat', in: 'path', required: true, schema: { type: 'string', example: 'A-03' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['trang_thai'],
                properties: {
                  trang_thai: { type: 'string', enum: ['Trống', 'Đã an táng', 'Đã đặt trước'] },
                  ho_ten: { type: 'string', example: 'Đặng Thị Cúc' },
                  thong_tin_than_nhan: { type: 'string', example: 'Lê Minh Tâm - 0918223344' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Cập nhật thành công' } },
      },
    },
    '/api/graves/allocate': {
      post: {
        tags: ['Graves'],
        summary: 'Cấp phát / đặt trước lô mộ trống (atomic transaction FOR UPDATE)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ma_lo_dat', 'trang_thai', 'ho_ten'],
                properties: {
                  ma_lo_dat: { type: 'string', example: 'A-02' },
                  trang_thai: { type: 'string', enum: ['Đã an táng', 'Đã đặt trước'] },
                  ho_ten: { type: 'string', example: 'Nguyễn Văn B' },
                  thong_tin_than_nhan: { type: 'string', example: '0909123456' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Cấp phát thành công' }, 409: { description: 'Lô đất đã được sử dụng' } },
      },
    },
    '/api/graves/export/csv': {
      get: {
        tags: ['Graves'],
        summary: 'Xuất báo cáo quy hoạch CSV có UTF-8 BOM',
        responses: { 200: { description: 'Tệp CSV báo cáo quy hoạch' } },
      },
    },
    '/api/zones': {
      get: {
        tags: ['Zones'],
        summary: 'Danh sách phân khu (hỗ trợ ?format=geojson)',
        parameters: [{ name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'geojson'] } }],
        responses: { 200: { description: 'Danh sách phân khu' } },
      },
    },
    '/api/zones/capacity': {
      get: {
        tags: ['Zones'],
        summary: 'Phân tích diện tích & sức chứa còn lại toàn nghĩa trang (có LRU Cache X-Cache)',
        responses: { 200: { description: 'Báo cáo diện tích và sức chứa còn lại' } },
      },
    },
    '/api/zones/{ma_phan_khu}/capacity': {
      get: {
        tags: ['Zones'],
        summary: 'Phân tích diện tích & sức chứa còn lại theo 1 phân khu',
        parameters: [{ name: 'ma_phan_khu', in: 'path', required: true, schema: { type: 'string', example: 'Khu A' } }],
        responses: { 200: { description: 'Báo cáo sức chứa phân khu' } },
      },
    },
    '/api/zones/infrastructure': {
      get: {
        tags: ['Zones'],
        summary: 'Danh sách công trình hạ tầng & bán kính cách ly',
        responses: { 200: { description: 'Danh sách hạ tầng' } },
      },
    },
    '/api/zones/roads': {
      get: {
        tags: ['Zones'],
        summary: 'Danh sách tuyến giao thông nội bộ 3D',
        responses: { 200: { description: 'Danh sách tuyến đường 3D' } },
      },
    },
    '/api/topology/graves/{ma_lo_dat}': {
      get: {
        tags: ['Topology'],
        summary: 'Kiểm tra Topology 3D chi tiết cho 1 lô mộ (Containment, Adjacency, Buffer)',
        parameters: [
          { name: 'ma_lo_dat', in: 'path', required: true, schema: { type: 'string', example: 'A-01' } },
          { name: 'radius', in: 'query', schema: { type: 'number', default: 10 } },
        ],
        responses: { 200: { description: 'Kết quả kiểm tra Topology 3D' } },
      },
    },
    '/api/topology/audit': {
      get: {
        tags: ['Topology'],
        summary: 'Kiểm toán Topology toàn khu nghĩa trang (có LRU Cache X-Cache)',
        responses: { 200: { description: 'Báo cáo vi phạm toàn khu' } },
      },
    },
    '/api/topology/relations': {
      get: {
        tags: ['Topology'],
        summary: 'Danh sách quan hệ đã lưu trong bảng quan_he_topology',
        responses: { 200: { description: 'Danh sách bản ghi quan_he_topology' } },
      },
    },
    '/api/routing/shortest-path': {
      get: {
        tags: ['Routing'],
        summary: 'Tìm đường đi ngắn nhất 3D (Dijkstra) từ Cổng chính đến tọa độ đích',
        parameters: [
          { name: 'targetX', in: 'query', required: true, schema: { type: 'number', example: -22 } },
          { name: 'targetZ', in: 'query', required: true, schema: { type: 'number', example: -16 } },
          { name: 'startNode', in: 'query', schema: { type: 'string', default: 'GATE' } },
        ],
        responses: { 200: { description: 'Lộ trình 3D, quãng đường và thời gian đi bộ dự kiến' } },
      },
    },
    '/api/routing/network': {
      get: {
        tags: ['Routing'],
        summary: 'Mạng lưới đường nội bộ 3D dạng GeoJSON FeatureCollection',
        responses: { 200: { description: 'GeoJSON tuyến đường' } },
      },
    },
  },
};

module.exports = openApiSpec;
