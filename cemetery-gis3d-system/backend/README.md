# Backend — Hệ thống Quy hoạch Nghĩa trang Đô thị GIS 3D (IE402.R11)

Backend xây dựng theo **Kiến trúc 3 lớp (3-Tier Architecture — Chương 7 IE402)** kết hợp tổ chức **Modular / Feature-Based (`src/modules/`)**: mỗi chức năng có thư mục riêng, bên trong vẫn tách rõ 5 lớp `routes → validator → controller → service → repository`.

## 1. Cấu trúc thư mục

```text
backend/
├── .env.example
├── package.json
├── database/
│   ├── 01_init.sql                       # 7 bảng chuẩn ERD + GEOMETRY 3D (EPSG:3405) + GIST index
│   └── 02_seed.sql                       # Dữ liệu mẫu PolygonZ / MultiPolygonZ / LineStringZ + SUDM
└── src/
    ├── app.js                            # Express app (helmet, cors, compression, rateLimit, routes, errorHandler)
    ├── server.js                         # Khởi động server, kiểm tra PostGIS & Graceful Shutdown
    ├── config/                           # env.js, database.js (pg.Pool + withTransaction)
    ├── constants/                        # cemeteryConstants.js
    ├── middlewares/                      # requestLogger, validateRequest (Zod), notFoundHandler, errorHandler
    ├── utils/                            # AppError, asyncHandler, apiResponse, pgErrorMapper, terrainMath
    └── modules/                          # Phân chia theo chức năng nghiệp vụ
        ├── index.js                      # Gom nhóm toàn bộ module routes dưới /api
        ├── graves/                       # Quản lý lô mộ, cấp phát & xuất CSV
        │   ├── grave.routes.js
        │   ├── grave.validator.js
        │   ├── grave.controller.js
        │   ├── grave.service.js
        │   └── grave.repository.js
        ├── zones/                        # Quản lý phân khu, diện tích & sức chứa còn lại, hạ tầng, đường
        │   ├── zone.routes.js
        │   ├── zone.controller.js
        │   ├── zone.service.js
        │   ├── zone.repository.js
        │   └── infrastructure.repository.js
        ├── topology/                     # Kiểm tra Topology 3D (Containment, Adjacency, Buffer)
        │   ├── topology.routes.js
        │   ├── topology.validator.js
        │   ├── topology.controller.js
        │   ├── topology.service.js
        │   └── topology.repository.js
        ├── routing/                      # Định tuyến ngắn nhất 3D (Dijkstra) & mạng lưới đường
        │   ├── routing.routes.js
        │   ├── routing.validator.js
        │   ├── routing.controller.js
        │   ├── routing.service.js
        │   └── routing.repository.js
        └── health/                       # Liveness & Readiness check (PostgreSQL/PostGIS)
            ├── health.routes.js
            └── health.controller.js
```

## 2. Hướng dẫn chạy nhanh

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

## 3. Danh sách API chính

| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/health` | Kiểm tra liveness của Backend |
| `GET` | `/health/ready` | Kiểm tra kết nối PostgreSQL & phiên bản PostGIS |
| `GET` | `/api/graves` | Danh sách lô mộ 3D (`?ma_phan_khu=`, `?trang_thai=`, `?search=`, `?format=geojson`) |
| `GET` | `/api/graves/:ma_lo_dat` | Chi tiết 1 lô mộ kèm SUDM & người mất |
| `POST` | `/api/graves/allocate` | Cấp phát / đặt trước lô mộ mới (atomic transaction `FOR UPDATE`) |
| `PUT` | `/api/graves/:ma_lo_dat` | Cập nhật trạng thái vòng đời lô mộ |
| `GET` | `/api/graves/export/csv` | Xuất báo cáo quy hoạch CSV |
| `GET` | `/api/zones` | Danh sách phân khu (`?format=geojson`) |
| `GET` | `/api/zones/capacity` | Thống kê diện tích & sức chứa còn lại toàn nghĩa trang (PostGIS) |
| `GET` | `/api/zones/:ma_phan_khu/capacity` | Thống kê diện tích & sức chứa còn lại theo phân khu |
| `GET` | `/api/zones/infrastructure` | Danh sách công trình hạ tầng & vùng đệm cách ly |
| `GET` | `/api/zones/roads` | Danh sách tuyến giao thông nội bộ 3D |
| `GET` | `/api/topology/graves/:ma_lo_dat` | Kiểm tra Topology 3D (`ST_Contains`, `ST_3DDistance`, `ST_Buffer`) |
| `GET` | `/api/topology/audit` | Kiểm toán toàn bộ nghĩa trang tìm lỗi quy hoạch |
| `GET` | `/api/topology/relations` | Xem danh sách quan hệ trong bảng `quan_he_topology` |
| `GET` | `/api/routing/shortest-path` | Tìm đường đi ngắn nhất 3D (Dijkstra) từ Cổng chính |
| `GET` | `/api/routing/network` | Mạng lưới giao thông 3D dạng GeoJSON |
