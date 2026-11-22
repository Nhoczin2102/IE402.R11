-- 1. Thêm Phân khu
INSERT INTO phan_khu (ma_phan_khu, ten_phan_khu) VALUES
('Khu A', 'Khu A (Đồi Đông)'),
('Khu B', 'Khu B (Trung Tâm)'),
('Khu C', 'Khu C (Đồi Tây)')
ON CONFLICT (ma_phan_khu) DO NOTHING;

-- 2. Thêm Mẫu mộ 3D
INSERT INTO mau_mo_3d (ma_mau, ten_mau_mo, chieu_cao_chuan) VALUES
('MM01', 'Mộ đơn tiêu chuẩn', 1.10),
('MM02', 'Mộ đôi gia đình', 1.35)
ON CONFLICT (ma_mau) DO NOTHING;

-- 3. Thêm Lô đất 3D (kèm phân lớp SUDM và Topology)
INSERT INTO lo_dat (
  ma_lo_dat, ma_phan_khu, ma_mau, vi_tri_hang_o, trang_thai,
  dien_tich_lo, cao_do_z, do_sau_huyet, toa_do_x, toa_do_z,
  surfaces_sudm, topology_info
) VALUES
(
  'A-01', 'Khu A', 'MM01', 'Hàng 1 - Ô 1', 'Đã an táng',
  4.50, 1.25, 2.00, -18, -14,
  '[{"id":"s1","surfaceType":"GroundSurface","label":"Bệ móng đá","areaM2":4.5},{"id":"s2","surfaceType":"WallSurface","label":"Thân mộ đá xanh","areaM2":3.3},{"id":"s3","surfaceType":"RoofSurface","label":"Bia mộ granite","areaM2":1.1}]'::jsonb,
  '{"khoang_cach_ke_can":0.6,"hop_le_quy_hoach":true}'::jsonb
),
(
  'A-02', 'Khu A', 'MM01', 'Hàng 1 - Ô 2', 'Trống',
  4.50, 1.40, 2.00, -13, -14,
  '[{"id":"s1","surfaceType":"GroundSurface","label":"Bệ móng chuẩn","areaM2":4.5},{"id":"s2","surfaceType":"WallSurface","label":"Thân mộ dự kiến","areaM2":3.3},{"id":"s3","surfaceType":"RoofSurface","label":"Bia mộ chuẩn","areaM2":1.1}]'::jsonb,
  '{"khoang_cach_ke_can":0.6,"hop_le_quy_hoach":true}'::jsonb
),
(
  'B-01', 'Khu B', 'MM02', 'Hàng 1 - Ô 1', 'Đã đặt trước',
  6.20, 0.85, 2.20, -6, 6,
  '[{"id":"s1","surfaceType":"GroundSurface","label":"Bệ móng đôi","areaM2":6.2},{"id":"s2","surfaceType":"WallSurface","label":"Thân mộ đôi","areaM2":4.4},{"id":"s3","surfaceType":"RoofSurface","label":"Bia đôi","areaM2":1.5}]'::jsonb,
  '{"khoang_cach_ke_can":0.8,"hop_le_quy_hoach":true}'::jsonb
),
(
  'B-02', 'Khu B', 'MM01', 'Hàng 1 - Ô 2', 'Trống',
  4.50, 0.92, 2.00, 6, 6,
  '[{"id":"s1","surfaceType":"GroundSurface","label":"Bệ móng chuẩn","areaM2":4.5},{"id":"s2","surfaceType":"WallSurface","label":"Thân mộ dự kiến","areaM2":3.3},{"id":"s3","surfaceType":"RoofSurface","label":"Bia mộ chuẩn","areaM2":1.1}]'::jsonb,
  '{"khoang_cach_ke_can":0.6,"hop_le_quy_hoach":true}'::jsonb
),
(
  'C-01', 'Khu C', 'MM01', 'Hàng 2 - Ô 1', 'Đã an táng',
  4.50, -1.20, 2.00, 18, -10,
  '[{"id":"s1","surfaceType":"GroundSurface","label":"Bệ móng đá","areaM2":4.5},{"id":"s2","surfaceType":"WallSurface","label":"Thân mộ đá xám","areaM2":3.3},{"id":"s3","surfaceType":"RoofSurface","label":"Bia mộ","areaM2":1.1}]'::jsonb,
  '{"khoang_cach_ke_can":0.6,"hop_le_quy_hoach":true}'::jsonb
),
(
  'C-02', 'Khu C', 'MM01', 'Hàng 2 - Ô 2', 'Trống',
  4.50, 1.10, 2.00, 18, -4,
  '[{"id":"s1","surfaceType":"GroundSurface","label":"Bệ móng chuẩn","areaM2":4.5},{"id":"s2","surfaceType":"WallSurface","label":"Thân mộ dự kiến","areaM2":3.3},{"id":"s3","surfaceType":"RoofSurface","label":"Bia mộ chuẩn","areaM2":1.1}]'::jsonb,
  '{"khoang_cach_ke_can":0.6,"hop_le_quy_hoach":true}'::jsonb
)
ON CONFLICT (ma_lo_dat) DO NOTHING;

-- 4. Thêm Hồ sơ Người mất
INSERT INTO nguoi_mat (ma_lo_dat, ho_ten, ngay_sinh, ngay_mat, ngay_an_tang, thong_tin_than_nhan) VALUES
('A-01', 'Nguyễn Văn An', '12/04/1942', '08/09/2023', '11/09/2023', 'Nguyễn Minh Tuấn - 0909123456'),
('B-01', 'Trần Thị Bình (Đặt trước)', NULL, NULL, NULL, 'Trần Hoàng Nam - 0912345678'),
('C-01', 'Lê Hữu Cường', '20/11/1950', '15/01/2024', '18/01/2024', 'Lê Thị Hoa - 0988765432')
ON CONFLICT (ma_lo_dat) DO NOTHING;