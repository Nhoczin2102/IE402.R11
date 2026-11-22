-- =============================================================================
-- DỮ LIỆU MẪU GIS 3D (Seed Data) - ĐỒNG BỘ TỌA ĐỘ 3D & HÌNH HỌC POSTGIS (EPSG:3405)
-- =============================================================================

-- 1. Phân khu quy hoạch (PolygonZ)
INSERT INTO phan_khu (ma_phan_khu, ten_phan_khu, loai_phan_khu, dien_tich_khu, mat_do_mo_toi_da, cao_do_nen_tb, geom_3d) VALUES
(
  'Khu A', 'Khu A (Đồi Đông)', 'Khu mộ đơn & mộ đá', 450.00, 55.00, 1.35,
  ST_GeomFromText('POLYGON Z((-30 -24 1.35, -6 -24 1.35, -6 -4 1.35, -30 -4 1.35, -30 -24 1.35))', 3405)
),
(
  'Khu B', 'Khu B (Trung Tâm)', 'Khu mộ gia tộc & tiêu chuẩn', 420.00, 50.00, 1.15,
  ST_GeomFromText('POLYGON Z((-12 -2 1.15, 12 -2 1.15, 12 16 1.15, -12 16 1.15, -12 -2 1.15))', 3405)
),
(
  'Khu C', 'Khu C (Đồi Tây)', 'Khu mộ có mái che', 440.00, 55.00, 1.10,
  ST_GeomFromText('POLYGON Z((8 -20 1.10, 30 -20 1.10, 30 0 1.10, 8 0 1.10, 8 -20 1.10))', 3405)
)
ON CONFLICT (ma_phan_khu) DO NOTHING;

-- 2. Mẫu mộ 3D chuẩn (B-Rep / SUDM)
INSERT INTO mau_mo_3d (
  ma_mau_mo, ten_mau_mo, chieu_dai_chuan, chieu_rong_chuan,
  dien_tich_chuan, chieu_cao_chuan, khoang_cach_ke_toi_thieu, model_3d_url
) VALUES
('MM01', 'Mộ đơn tiêu chuẩn',      2.20, 1.60, 3.52, 1.10, 0.50, '/models/mo-don-tieu-chuan.glb'),
('MM02', 'Mộ đơn đá Granite',      2.20, 1.60, 3.52, 1.20, 0.50, '/models/mo-don-granite.glb'),
('MM03', 'Mộ đá xanh Thanh Hóa',   2.35, 1.62, 3.80, 1.30, 0.55, '/models/mo-da-xanh.glb'),
('MM04', 'Lăng mộ gia tộc nhỏ',    2.50, 1.68, 4.20, 1.45, 0.70, '/models/lang-mo-gia-toc.glb'),
('MM05', 'Mộ đơn có mái che',      2.25, 1.60, 3.60, 1.50, 0.60, '/models/mo-don-mai-che.glb')
ON CONFLICT (ma_mau_mo) DO NOTHING;

-- 3. Lô đất 3D (PolygonZ thực tại tọa độ khớp Frontend 3D + mặt ngữ nghĩa SUDM)
INSERT INTO lo_dat (
  ma_lo_dat, ma_phan_khu, ma_mau_mo, vi_tri_hang_o, trang_thai,
  dien_tich_lo, cao_do_z, goc_xoay_z, do_sau_huyet, toa_do_x, toa_do_z,
  geom_3d, surfaces_sudm, topology_info
) VALUES
(
  'A-01', 'Khu A', 'MM02', 'Hàng 1 - Ô 1', 'Đã an táng',
  3.52, 1.25, 0.00, 2.00, -22, -16,
  ST_GeomFromText('POLYGON Z((-23.1 -16.8 1.25, -20.9 -16.8 1.25, -20.9 -15.2 1.25, -23.1 -15.2 1.25, -23.1 -16.8 1.25))', 3405),
  '[{"id":"F_GROUND","surfaceType":"GroundSurface","label":"Móng bệ bê tông tiếp đất","areaM2":3.52},{"id":"F_WALL","surfaceType":"WallSurface","label":"4 Mặt tường bao thân mộ","areaM2":4.80},{"id":"F_ROOF","surfaceType":"RoofSurface","label":"Nắp mộ & Mặt bia đá","areaM2":2.95}]'::jsonb,
  '{"khoang_cach_ke_can":0.6,"hop_le_quy_hoach":true}'::jsonb
),
(
  'A-02', 'Khu A', 'MM01', 'Hàng 1 - Ô 2', 'Trống',
  3.52, 1.40, 0.00, 2.00, -17, -16,
  ST_GeomFromText('POLYGON Z((-18.1 -16.8 1.40, -15.9 -16.8 1.40, -15.9 -15.2 1.40, -18.1 -15.2 1.40, -18.1 -16.8 1.40))', 3405),
  '[{"id":"F_GROUND","surfaceType":"GroundSurface","label":"Móng bệ bê tông tiếp đất","areaM2":3.52},{"id":"F_WALL","surfaceType":"WallSurface","label":"4 Mặt tường bao thân mộ","areaM2":4.80},{"id":"F_ROOF","surfaceType":"RoofSurface","label":"Nắp mộ & Mặt bia đá","areaM2":2.95}]'::jsonb,
  '{"khoang_cach_ke_can":0.6,"hop_le_quy_hoach":true}'::jsonb
),
(
  'A-03', 'Khu A', 'MM01', 'Hàng 1 - Ô 3', 'Đã đặt trước',
  3.52, 1.30, 0.00, 2.00, -12, -16,
  ST_GeomFromText('POLYGON Z((-13.1 -16.8 1.30, -10.9 -16.8 1.30, -10.9 -15.2 1.30, -13.1 -15.2 1.30, -13.1 -16.8 1.30))', 3405),
  '[{"id":"F_GROUND","surfaceType":"GroundSurface","label":"Móng bệ bê tông tiếp đất","areaM2":3.52},{"id":"F_WALL","surfaceType":"WallSurface","label":"4 Mặt tường bao thân mộ","areaM2":4.80},{"id":"F_ROOF","surfaceType":"RoofSurface","label":"Nắp mộ & Mặt bia đá","areaM2":2.95}]'::jsonb,
  '{"khoang_cach_ke_can":0.55,"hop_le_quy_hoach":true}'::jsonb
),
(
  'A-04', 'Khu A', 'MM03', 'Hàng 2 - Ô 1', 'Đã an táng',
  3.80, 1.45, 0.00, 2.20, -22, -10,
  ST_GeomFromText('POLYGON Z((-23.18 -10.81 1.45, -20.82 -10.81 1.45, -20.82 -9.19 1.45, -23.18 -9.19 1.45, -23.18 -10.81 1.45))', 3405),
  '[{"id":"F_GROUND","surfaceType":"GroundSurface","label":"Móng bệ bê tông tiếp đất","areaM2":3.80},{"id":"F_WALL","surfaceType":"WallSurface","label":"4 Mặt tường bao đá xanh","areaM2":5.10},{"id":"F_ROOF","surfaceType":"RoofSurface","label":"Nắp mộ & Bia đá xanh","areaM2":3.10}]'::jsonb,
  '{"khoang_cach_ke_can":0.6,"hop_le_quy_hoach":true}'::jsonb
),
(
  'B-01', 'Khu B', 'MM04', 'Hàng 1 - Ô 1', 'Đã an táng',
  4.20, 1.18, 0.00, 2.20, -3, 2,
  ST_GeomFromText('POLYGON Z((-4.25 1.16 1.18, -1.75 1.16 1.18, -1.75 2.84 1.18, -4.25 2.84 1.18, -4.25 1.16 1.18))', 3405),
  '[{"id":"F_GROUND","surfaceType":"GroundSurface","label":"Móng bệ gia tộc","areaM2":4.20},{"id":"F_WALL","surfaceType":"WallSurface","label":"Tường bao lăng mộ","areaM2":5.60},{"id":"F_ROOF","surfaceType":"RoofSurface","label":"Mái che & Bia gia tộc","areaM2":3.40}]'::jsonb,
  '{"khoang_cach_ke_can":0.8,"hop_le_quy_hoach":true}'::jsonb
),
(
  'B-02', 'Khu B', 'MM04', 'Hàng 1 - Ô 2', 'Trống',
  4.20, 1.25, 0.00, 2.20, 3, 2,
  ST_GeomFromText('POLYGON Z((1.75 1.16 1.25, 4.25 1.16 1.25, 4.25 2.84 1.25, 1.75 2.84 1.25, 1.75 1.16 1.25))', 3405),
  '[{"id":"F_GROUND","surfaceType":"GroundSurface","label":"Móng bệ gia tộc","areaM2":4.20},{"id":"F_WALL","surfaceType":"WallSurface","label":"Tường bao dự kiến","areaM2":5.60},{"id":"F_ROOF","surfaceType":"RoofSurface","label":"Mái che chuẩn","areaM2":3.40}]'::jsonb,
  '{"khoang_cach_ke_can":0.8,"hop_le_quy_hoach":true}'::jsonb
),
(
  'B-03', 'Khu B', 'MM01', 'Hàng 2 - Ô 1', 'Trống',
  3.52, 1.10, 0.00, 2.00, -3, 8,
  ST_GeomFromText('POLYGON Z((-4.1 7.2 1.10, -1.9 7.2 1.10, -1.9 8.8 1.10, -4.1 8.8 1.10, -4.1 7.2 1.10))', 3405),
  '[{"id":"F_GROUND","surfaceType":"GroundSurface","label":"Móng bệ bê tông tiếp đất","areaM2":3.52},{"id":"F_WALL","surfaceType":"WallSurface","label":"4 Mặt tường bao thân mộ","areaM2":4.80},{"id":"F_ROOF","surfaceType":"RoofSurface","label":"Nắp mộ & Mặt bia đá","areaM2":2.95}]'::jsonb,
  '{"khoang_cach_ke_can":0.5,"hop_le_quy_hoach":true}'::jsonb
),
(
  'C-01', 'Khu C', 'MM05', 'Hàng 1 - Ô 1', 'Đã an táng',
  3.60, 1.05, 0.00, 1.90, 16, -12,
  ST_GeomFromText('POLYGON Z((14.875 -12.8 1.05, 17.125 -12.8 1.05, 17.125 -11.2 1.05, 14.875 -11.2 1.05, 14.875 -12.8 1.05))', 3405),
  '[{"id":"F_GROUND","surfaceType":"GroundSurface","label":"Móng bệ bê tông","areaM2":3.60},{"id":"F_WALL","surfaceType":"WallSurface","label":"Thân mộ có mái che","areaM2":4.95},{"id":"F_ROOF","surfaceType":"RoofSurface","label":"Mái vòm đá","areaM2":3.20}]'::jsonb,
  '{"khoang_cach_ke_can":0.65,"hop_le_quy_hoach":true}'::jsonb
),
(
  'C-02', 'Khu C', 'MM05', 'Hàng 1 - Ô 2', 'Đã đặt trước',
  3.60, 1.15, 0.00, 1.90, 21, -12,
  ST_GeomFromText('POLYGON Z((19.875 -12.8 1.15, 22.125 -12.8 1.15, 22.125 -11.2 1.15, 19.875 -11.2 1.15, 19.875 -12.8 1.15))', 3405),
  '[{"id":"F_GROUND","surfaceType":"GroundSurface","label":"Móng bệ bê tông","areaM2":3.60},{"id":"F_WALL","surfaceType":"WallSurface","label":"Thân mộ dự kiến","areaM2":4.95},{"id":"F_ROOF","surfaceType":"RoofSurface","label":"Mái vòm đá","areaM2":3.20}]'::jsonb,
  '{"khoang_cach_ke_can":0.65,"hop_le_quy_hoach":true}'::jsonb
),
(
  'C-03', 'Khu C', 'MM01', 'Hàng 2 - Ô 1', 'Trống',
  3.52, 1.10, 0.00, 1.80, 16, -6,
  ST_GeomFromText('POLYGON Z((14.9 -6.8 1.10, 17.1 -6.8 1.10, 17.1 -5.2 1.10, 14.9 -5.2 1.10, 14.9 -6.8 1.10))', 3405),
  '[{"id":"F_GROUND","surfaceType":"GroundSurface","label":"Móng bệ bê tông tiếp đất","areaM2":3.52},{"id":"F_WALL","surfaceType":"WallSurface","label":"4 Mặt tường bao thân mộ","areaM2":4.80},{"id":"F_ROOF","surfaceType":"RoofSurface","label":"Nắp mộ & Mặt bia đá","areaM2":2.95}]'::jsonb,
  '{"khoang_cach_ke_can":0.6,"hop_le_quy_hoach":true}'::jsonb
)
ON CONFLICT (ma_lo_dat) DO NOTHING;

-- 4. Hồ sơ Người mất
INSERT INTO nguoi_mat (ma_nguoi_mat, ma_lo_dat, ho_ten, ngay_sinh, ngay_mat, ngay_an_tang, thong_tin_than_nhan) VALUES
('NM-A01', 'A-01', 'Nguyễn Văn An',            '12/04/1942', '20/08/2019', '23/08/2019', 'Nguyễn Văn Bình (Con trai) - 0901234567'),
('NM-A03', 'A-03', 'Đặng Thị Cúc (Đặt trước)', NULL,         NULL,         NULL,         'Lê Minh Tâm - 0918223344'),
('NM-A04', 'A-04', 'Trần Hoàng Dũng',          '05/09/1935', '11/11/2021', '14/11/2021', 'Trần Thị Mai - 0987654321'),
('NM-B01', 'B-01', 'Phạm Hữu Phước',           '19/02/1950', '02/03/2023', '05/03/2023', 'Phạm Quốc Bảo - 0933445566'),
('NM-C01', 'C-01', 'Võ Thị Sáu',               '10/10/1948', '15/06/2020', '18/06/2020', 'Võ Văn Hùng - 0977889900'),
('NM-C02', 'C-02', 'Hoàng Văn Thụ (Đặt trước)',NULL,         NULL,         NULL,         'Hoàng Lan Anh - 0944556677')
ON CONFLICT (ma_nguoi_mat) DO NOTHING;

-- 5. Hạ tầng công trình (MultiPolygonZ + bán kính cách ly cho phân tích Buffer)
INSERT INTO ha_tang (ma_ha_tang, ma_phan_khu, ten_ha_tang, loai_ha_tang, dien_tich_xay_dung, chieu_cao_3d, ban_kinh_cach_ly, geom_3d) VALUES
(
  'HT-GATE', NULL, 'Cổng Tam Quan Chính', 'Cổng vào', 36.00, 6.50, 5.00,
  ST_GeomFromText('MULTIPOLYGON Z(((-6 40 0.5, 6 40 0.5, 6 43 0.5, -6 43 0.5, -6 40 0.5)))', 3405)
),
(
  'HT-MON', NULL, 'Đài Tưởng Niệm Trung Tâm', 'Công trình tâm linh', 64.00, 9.00, 4.00,
  ST_GeomFromText('MULTIPOLYGON Z(((-4 -29 1.5, 4 -29 1.5, 4 -21 1.5, -4 -21 1.5, -4 -29 1.5)))', 3405)
),
(
  'HT-PLAZA', 'Khu B', 'Quảng Trường Tưởng Niệm Nam', 'Quảng trường', 100.00, 0.30, 2.00,
  ST_GeomFromText('MULTIPOLYGON Z(((-5 15 0.8, 5 15 0.8, 5 25 0.8, -5 25 0.8, -5 15 0.8)))', 3405)
)
ON CONFLICT (ma_ha_tang) DO NOTHING;

-- 6. Mạng lưới Tuyến giao thông nội bộ 3D (LineStringZ)
INSERT INTO tuyen_giao_thong (ma_tuyen_duong, ma_phan_khu, ten_tuyen_duong, loai_duong, chieu_rong_duong, dien_tich_duong, geom_3d) VALUES
(
  'TD-MAIN', NULL, 'Trục Chính Bắc - Nam', 'Trục chính', 4.00, 268.00,
  ST_GeomFromText('LINESTRING Z(0 42 0.5, 0 20 0.8, 0 5 1.1, 0 -14 1.2, 0 -25 1.5)', 3405)
),
(
  'TD-WEST-A', 'Khu A', 'Nhánh Đồi Đông (Khu A)', 'Lối đi bộ', 2.50, 42.50,
  ST_GeomFromText('LINESTRING Z(0 -14 1.2, -17 -14 1.35)', 3405)
),
(
  'TD-EAST-C', 'Khu C', 'Nhánh Đồi Tây (Khu C)', 'Lối đi bộ', 2.50, 46.00,
  ST_GeomFromText('LINESTRING Z(0 -14 1.2, 18 -10 1.1)', 3405)
)
ON CONFLICT (ma_tuyen_duong) DO NOTHING;

-- 7. Quan hệ Topology mẫu (Containment & Adjacency)
INSERT INTO quan_he_topology (ma_lo_dat_goc, ma_lo_dat_ke_can, ma_ha_tang_tiep_giap, ma_duong_tiep_giap, loai_quan_he, khoang_cach_3d, hop_le_quy_hoach) VALUES
('A-01', 'A-02', NULL, NULL, 'ADJACENT', 2.80, TRUE),
('A-02', 'A-03', NULL, NULL, 'ADJACENT', 2.80, TRUE),
('A-01', 'A-04', NULL, NULL, 'ADJACENT', 4.39, TRUE),
('B-01', 'B-02', NULL, NULL, 'ADJACENT', 3.50, TRUE),
('C-01', 'C-02', NULL, NULL, 'ADJACENT', 2.75, TRUE)
ON CONFLICT DO NOTHING;
