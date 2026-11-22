CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Bảng Phân khu quy hoạch
CREATE TABLE phan_khu (
    ma_phan_khu VARCHAR(20) PRIMARY KEY,
    ten_phan_khu VARCHAR(100) NOT NULL,
    ranh_gioi_3d GEOMETRY(PolygonZ, 3405)
);

-- 2. Bảng Mẫu mộ 3D (B-Rep Solid)
CREATE TABLE mau_mo_3d (
    ma_mau VARCHAR(20) PRIMARY KEY,
    ten_mau_mo VARCHAR(100) NOT NULL,
    chieu_cao_chuan NUMERIC(5,2) NOT NULL
);

-- 3. Bảng Lô đất & Ngôi mộ 3D (Tích hợp mặt ngữ nghĩa SUDM)
CREATE TABLE lo_dat (
    ma_lo_dat VARCHAR(20) PRIMARY KEY,
    ma_phan_khu VARCHAR(20) REFERENCES phan_khu(ma_phan_khu),
    ma_mau VARCHAR(20) REFERENCES mau_mo_3d(ma_mau),
    vi_tri_hang_o VARCHAR(50),
    trang_thai VARCHAR(30) CHECK (trang_thai IN ('Trống', 'Đã an táng', 'Đã đặt trước')),
    dien_tich_lo NUMERIC(6,2),
    cao_do_z NUMERIC(6,2),
    do_sau_huyet NUMERIC(5,2) DEFAULT 2.0,
    toa_do_x NUMERIC(8,2),
    toa_do_z NUMERIC(8,2),
    hinh_hoc_3d GEOMETRY(PolygonZ, 3405),
    surfaces_sudm JSONB, -- Lưu danh sách GroundSurface, WallSurface, RoofSurface
    topology_info JSONB
);

-- 4. Bảng Hồ sơ Người mất
CREATE TABLE nguoi_mat (
    id SERIAL PRIMARY KEY,
    ma_lo_dat VARCHAR(20) UNIQUE REFERENCES lo_dat(ma_lo_dat),
    ho_ten VARCHAR(120) NOT NULL,
    ngay_sinh VARCHAR(20),
    ngay_mat VARCHAR(20),
    ngay_an_tang VARCHAR(20),
    thong_tin_than_nhan TEXT
);

-- 5. Bảng Mạng lưới Tuyến giao thông nội bộ 3D
CREATE TABLE tuyen_giao_thong (
    id SERIAL PRIMARY KEY,
    ten_tuyen VARCHAR(100),
    loai_duong VARCHAR(30), -- 'Trục chính', 'Lối đi bộ'
    do_rong NUMERIC(4,2),
    duong_3d GEOMETRY(LineStringZ, 3405)
);