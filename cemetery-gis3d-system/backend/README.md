# Backend — Hệ thống Quy hoạch Nghĩa trang Đô thị GIS 3D (IE402.R11)

Backend xây dựng theo **Kiến trúc 3 lớp (3-Tier Architecture — Chương 7 IE402)** kết hợp phân tầng nội bộ **Routes → Validators → Controllers → Services → Repositories → PostgreSQL/PostGIS**.

## 1. Cấu trúc thư mục

```text
backend/
├── .env.example
├── package.json
├── database/
│   ├── 01_init.sql               # 7 bảng chuẩn ERD + GEOMETRY 3D (EPSG:3405) + GIST index
│   └── 02_seed.sql               # Dữ liệu mẫu PolygonZ / MultiPolygonZ / LineStringZ + SUDM
└── src/
    ├── app.js                    # Khởi tạo Express, Helmet, CORS, Compression, Rate Limit
    ├── server.js                 # Khởi động HTTP Server, kiểm tra PostGIS & Graceful Shutdown
    ├── config/                   # env.js, database.js (pg.Pool + withTransaction)
    ├── constants/                # Hằng số nghiệp vụ & mạng lưới 3D
    ├── middlewares/              # requestLogger, validateRequest (Zod), notFoundHandler, errorHandler
    ├── validators/               # Schema kiểm tra đầu vào cho graves, routing, topology
    ├── repositories/             # Truy vấn SQL/PostGIS thuần (ST_Contains, ST_3DDistance, ST_Area, ST_Buffer...)
    ├── services/                 # Xử lý nghiệp vụ quy hoạch, sức chứa, topology, Dijkstra 3D
    ├── controllers/              # Điều phối HTTP request/response
    └── routes/                   # Khai báo endpoint REST API
```

## 2. Hướng dẫn chạy nhanh

```bash
# 1. Khởi chạy PostgreSQL + PostGIS (tại thư mục gốc cemetery-gis3d-system)
docker compose up -d

# 2. Cài đặt thư viện Backend
cd backend
cp .env.example .env
npm install

# 3. Chạy chế độ phát triển
npm run dev
```

## 3. Danh sách API chính

| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/health` | Kiểm tra liveness của Backend |
| `GET` | `/health/ready` | Kiểm tra kết nối PostgreSQL & phiên bản PostGIS |
| `GET` | `/api/graves` | Lấy danh sách lô mộ 3D (hỗ trợ `?ma_phan_khu=`, `?trang_thai=`, `?search=`, `?format=geojson`) |
| `GET` | `/api/graves/:ma_lo_dat` | Chi tiết 1 lô mộ kèm SUDM & người mất |
| `POST` | `/api/graves/allocate` | Cấp phát / đặt trước lô mộ mới (atomic transaction `FOR UPDATE`) |
| `PUT` | `/api/graves/:ma_lo_dat` | Cập nhật vòng đời lô mộ (xác nhận an táng / thu hồi trả trống) |
| `GET` | `/api/graves/export/csv` | Xuất báo cáo quy hoạch CSV trực tiếp từ Backend |
| `GET` | `/api/zones` | Danh sách phân khu (hỗ trợ `?format=geojson`) |
| `GET` | `/api/zones/capacity` | Thống kê diện tích & sức chứa còn lại toàn nghĩa trang (PostGIS `ST_Area`, `ST_Buffer`, `ST_Intersection`) |
| `GET` | `/api/zones/:ma_phan_khu/capacity` | Thống kê diện tích & sức chứa còn lại của 1 phân khu |
| `GET` | `/api/zones/infrastructure` | Danh sách công trình hạ tầng & bán kính cách ly |
| `GET` | `/api/zones/roads` | Danh sách tuyến giao thông nội bộ 3D |
| `GET` | `/api/topology/graves/:ma_lo_dat` | Kiểm tra Topology 3D (Containment `ST_Contains`, Adjacency `ST_3DDistance`, Buffer `ST_Buffer`) |
| `GET` | `/api/topology/audit` | Kiểm toán toàn bộ nghĩa trang tìm lỗi vượt ranh giới, chồng lấp hoặc vi phạm vùng đệm |
| `GET` | `/api/topology/relations` | Xem danh sách quan hệ lưu trong bảng `quan_he_topology` |
| `GET` | `/api/routing/shortest-path` | Tìm đường đi ngắn nhất 3D (Dijkstra) từ Cổng chính đến `(targetX, targetZ)` |
| `GET` | `/api/routing/network` | Lấy mạng lưới đường 3D dạng GeoJSON |
