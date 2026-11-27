# Backend v2.2.0 — Hệ thống Quy hoạch Nghĩa trang Đô thị GIS 3D (Supabase PostGIS 4326 + Three.js Sync)

Backend xây dựng theo **Kiến trúc 3 lớp (3-Tier Architecture — Chương 7 IE402)** kết hợp tổ chức **Modular / Feature-Based (`src/modules/`)**, đồng bộ hoàn toàn với lược đồ **7 bảng ERD trên Supabase (SRID 4326)** và hệ trục tọa độ **Three.js (`[x, y, z]`)** của Frontend.

## 1. Điểm đồng bộ & nâng cấp chính ở bản v2.2.0
- **Quy đổi tọa độ WGS84 (`4326`) → Three.js `[x, y, z]` ngay trong PostGIS:** Dùng `ST_Transform(..., 3857)` trừ tâm nghĩa trang `(106.78060, 10.87050)` và đồng bộ cao độ `y = getTerrainHeight(x, z)` để khối mộ nằm khít trên mặt đồi 3D của Frontend (vẫn giữ `cao_do_z_db` thực từ Supabase).
- **Ánh xạ 2 chiều DB ↔ Frontend:**
  - Trạng thái: `'TRONG' | 'DA_DAT_TRUOC' | 'DA_AN_TANG'` ↔ `'Trống' | 'Đã đặt trước' | 'Đã an táng'`.
  - Phân khu: `'PK-A' | 'PK-B' | 'PK-C'` ↔ `'Khu A' | 'Khu B' | 'Khu C'`.
  - Ngày tháng: Đọc cột `DATE` của `nguoi_mat` ra `DD/MM/YYYY` cho FE, và tự chuyển `DD/MM/YYYY` hoặc `YYYY-MM-DD` về `DATE` khi ghi xuống Supabase.
- **An toàn trước & sau khi chạy `ALTER TABLE` Bước 1:** Dùng `to_jsonb(ld)->>'do_sau_huyet'` và `to_jsonb(mm)->'surfaces'` nên chạy không bao giờ lỗi `500` dù bạn đã hay chưa chạy `database/03_sync_frontend_columns.sql` trên Supabase.
- **Chuẩn hóa kết nối Supabase & CORS:** `config/database.js` dùng đúng `env.db.ssl` + `search_path=public,extensions`; `app.js` tự cho phép cả `localhost:3000` lẫn `localhost:5173` ở môi trường dev mà không cần sửa `.env`; `grave.validator.js` cho phép `ho_ten: ""` khi thu hồi lô về `"Trống"`.
- **Tích hợp đầy đủ tiện ích GIS 3D:** Tài liệu tương tác Scalar (`/docs`), lọc `BBOX`/`LOD 1–3`, `POST /api/graves` kiểm tra cổng Topology 3D, tính diện tích & sức chứa còn lại (`/api/zones/capacity`), LRU Cache (`X-Cache`), `X-Request-Id` và bộ kiểm thử tự động (`npm test`).

## 2. Chạy & kiểm thử nhanh

1. *(Tùy chọn)* Dán nội dung `database/03_sync_frontend_columns.sql` vào **Supabase SQL Editor** để lưu động `do_sau_huyet` và `surfaces`.
2. Giữ nguyên tệp `.env` hiện tại trong thư mục `backend/`, rồi chạy:
```bash
cd backend
npm test
npm run dev
```
3. Mở `http://localhost:5000/health/ready`, `http://localhost:5000/api/graves`, và `http://localhost:5000/docs` để kiểm tra.
