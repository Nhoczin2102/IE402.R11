# Backend v2.1.0 — Hệ thống Quy hoạch Nghĩa trang Đô thị GIS 3D (IE402.R11)

Backend xây dựng theo **Kiến trúc 3 lớp (3-Tier Architecture — Chương 7 IE402)** kết hợp tổ chức **Modular / Feature-Based (`src/modules/`)**. Toàn bộ lược đồ 7 bảng ERD (`database/01_init.sql`, `database/02_seed.sql`) được giữ nguyên hoàn toàn.

## 1. Các tính năng nổi bật (v2.1.0)
- **Tài liệu API tương tác Scalar (`/docs` & `/openapi.json`):** Xem đặc tả OpenAPI 3.0.3 và bấm test mọi API trực tiếp tại `http://localhost:5000/docs`.
- **Lọc không gian `BBOX` + `LOD` (CityGML LOD 1/2/3):** `GET /api/graves?bbox=minX,minZ,maxX,maxZ&lod=1|2|3` dùng `ST_MakeEnvelope` kết hợp chỉ mục `GIST` (R-Tree) và tối ưu payload theo mức LOD.
- **Quy hoạch lô mộ mới có cổng kiểm tra Topology (`POST /api/graves`):** Tự động sinh `POLYGON Z`, kiểm tra `ST_IsValid`, `ST_Contains` (nằm gọn trong phân khu), không chồng lấp, đảm bảo `ST_3DDistance >= khoang_cach_ke_toi_thieu`, không vi phạm `ST_Buffer(ha_tang)` trước khi lưu và tự ghi nhận quan hệ kề cận vào `quan_he_topology`.
- **Tính thể tích 3D khối mộ & hố huyệt:** Trả thêm `the_tich_khoi_3d_m3` và `the_tich_ho_huyet_m3` trực tiếp từ truy vấn PostGIS.
- **LRU Cache + tự động xóa cache (`X-Cache: HIT | MISS`):** Tăng tốc `/api/zones/capacity` và `/api/topology/audit`, tự động làm mới ngay khi có `POST`/`PUT` thay đổi dữ liệu lô mộ.
- **Truy vết request & kiểm thử tự động:** Gắn `X-Request-Id` trên mọi phản hồi, ghi log có cấu trúc, Graceful Shutdown và bộ test `node:test` (`npm test`).

## 2. Cấu trúc thư mục

```text
backend/
├── .gitignore
├── package.json
├── README.md
├── database/
│   ├── 01_init.sql                       # 7 bảng chuẩn ERD + GEOMETRY 3D (EPSG:3405) + GIST index
│   └── 02_seed.sql                       # Dữ liệu mẫu PolygonZ / MultiPolygonZ / LineStringZ + SUDM
├── tests/
│   └── backend.test.js                   # Bộ kiểm thử tự động bằng node:test
└── src/
    ├── app.js                            # Express + Helmet + Compression + X-Request-Id + CORS + RateLimit
    ├── server.js                         # Khởi động server, kiểm tra PostGIS & Graceful Shutdown
    ├── config/                           # env.js, database.js (pg.Pool + withTransaction)
    ├── constants/                        # cemeteryConstants.js
    ├── middlewares/                      # requestId, requestLogger, validateRequest, notFoundHandler, errorHandler
    ├── utils/                            # AppError, asyncHandler, apiResponse, memoryCache, pgErrorMapper, terrainMath
    └── modules/                          # Phân chia theo từng chức năng nghiệp vụ
        ├── index.js                      # Gom nhóm toàn bộ routes dưới /api
        ├── docs/                         # openapi.spec.js, docs.routes.js (/docs & /openapi.json)
        ├── graves/                       # grave.(routes|validator|controller|service|repository).js
        ├── zones/                        # zone.(routes|controller|service|repository).js + infrastructure.repository.js
        ├── topology/                     # topology.(routes|validator|controller|service|repository).js
        ├── routing/                      # routing.(routes|validator|controller|service|repository).js
        └── health/                       # health.(routes|controller).js
```

## 3. Cấu hình `.env` & chạy nhanh

Đảm bảo có tệp `.env` trong thư mục `backend/` với các biến môi trường `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, sau đó chạy:

```bash
cd backend
npm install
npm test        # Chạy bộ kiểm thử tự động
npm run dev     # Khởi chạy Backend tại http://localhost:5000
```

## 4. Danh sách đầy đủ API

| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/docs` | Giao diện tài liệu API tương tác Scalar |
| `GET` | `/openapi.json` | Đặc tả OpenAPI 3.0.3 dạng JSON |
| `GET` | `/health` | Kiểm tra liveness của Backend |
| `GET` | `/health/ready` | Kiểm tra kết nối PostgreSQL & phiên bản PostGIS |
| `GET` | `/api/graves` | Danh sách lô mộ 3D (`?ma_phan_khu=`, `?trang_thai=`, `?search=`, `?bbox=`, `?lod=1\|2\|3`, `?format=geojson`) |
| `POST` | `/api/graves` | Quy hoạch tạo lô mộ 3D mới (tự kiểm tra cổng Topology PostGIS trước khi lưu) |
| `GET` | `/api/graves/:ma_lo_dat` | Chi tiết 1 lô mộ kèm thể tích 3D, SUDM & hồ sơ người mất |
| `POST` | `/api/graves/allocate` | Cấp phát / đặt trước lô mộ trống (atomic transaction `FOR UPDATE`) |
| `PUT` | `/api/graves/:ma_lo_dat` | Cập nhật trạng thái vòng đời lô mộ (xác nhận an táng / thu hồi trả trống) |
| `GET` | `/api/graves/export/csv` | Xuất báo cáo quy hoạch CSV có UTF-8 BOM |
| `GET` | `/api/zones` | Danh sách phân khu (`?format=geojson`) |
| `GET` | `/api/zones/capacity` | Thống kê diện tích & sức chứa còn lại toàn nghĩa trang (PostGIS + LRU Cache) |
| `GET` | `/api/zones/:ma_phan_khu/capacity` | Thống kê diện tích & sức chứa còn lại theo phân khu |
| `GET` | `/api/zones/infrastructure` | Danh sách công trình hạ tầng & vùng đệm cách ly |
| `GET` | `/api/zones/roads` | Danh sách tuyến giao thông nội bộ 3D |
| `GET` | `/api/topology/graves/:ma_lo_dat` | Kiểm tra Topology 3D (`ST_Contains`, `ST_3DDistance`, `ST_Buffer`) |
| `GET` | `/api/topology/audit` | Kiểm toán toàn bộ nghĩa trang tìm lỗi quy hoạch (PostGIS + LRU Cache) |
| `GET` | `/api/topology/relations` | Xem danh sách quan hệ trong bảng `quan_he_topology` |
| `GET` | `/api/routing/shortest-path` | Tìm đường đi ngắn nhất 3D (Dijkstra) từ Cổng chính đến `(targetX, targetZ)` |
| `GET` | `/api/routing/network` | Mạng lưới giao thông 3D dạng GeoJSON |
