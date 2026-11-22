-- =============================================================================
-- IE402.R11 - HỆ THỐNG THÔNG TIN ĐỊA LÝ 3 CHIỀU (GIS 3D)
-- Đề tài STT 6: Ứng dụng GIS 3D trong quy hoạch nghĩa trang đô thị
-- Mức vật lý (Physical Schema) trên PostgreSQL 16 + PostGIS 3.4 (EPSG:3405)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- -----------------------------------------------------------------------------
-- 1. Bảng PhanKhu (Phân khu quy hoạch nghĩa trang)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS phan_khu (
    ma_phan_khu       VARCHAR(20) PRIMARY KEY,
    ten_phan_khu      VARCHAR(100) NOT NULL,
    loai_phan_khu     VARCHAR(50) NOT NULL DEFAULT 'Khu mộ đơn',
    dien_tich_khu     NUMERIC(12, 2) NOT NULL CHECK (dien_tich_khu > 0),
    mat_do_mo_toi_da  NUMERIC(5, 2) NOT NULL CHECK (mat_do_mo_toi_da > 0 AND mat_do_mo_toi_da <= 100),
    cao_do_nen_tb     NUMERIC(6, 2) DEFAULT 0,
    geom_3d           GEOMETRY(PolygonZ, 3405) NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. Bảng MauMo3D (Mẫu mộ chuẩn theo mô hình B-Rep / SUDM)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mau_mo_3d (
    ma_mau_mo                VARCHAR(20) PRIMARY KEY,
    ten_mau_mo               VARCHAR(100) NOT NULL,
    chieu_dai_chuan          NUMERIC(5, 2) NOT NULL CHECK (chieu_dai_chuan > 0),
    chieu_rong_chuan         NUMERIC(5, 2) NOT NULL CHECK (chieu_rong_chuan > 0),
    dien_tich_chuan          NUMERIC(6, 2) NOT NULL CHECK (dien_tich_chuan > 0),
    chieu_cao_chuan          NUMERIC(5, 2) NOT NULL CHECK (chieu_cao_chuan > 0),
    khoang_cach_ke_toi_thieu NUMERIC(4, 2) NOT NULL DEFAULT 0.50 CHECK (khoang_cach_ke_toi_thieu >= 0),
    model_3d_url             VARCHAR(255)
);

-- -----------------------------------------------------------------------------
-- 3. Bảng LoDat (Lô đất & Phần mộ 3D tích hợp mặt ngữ nghĩa SUDM)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lo_dat (
    ma_lo_dat      VARCHAR(30) PRIMARY KEY,
    ma_phan_khu    VARCHAR(20) NOT NULL REFERENCES phan_khu(ma_phan_khu) ON UPDATE CASCADE ON DELETE RESTRICT,
    ma_mau_mo      VARCHAR(20) NOT NULL REFERENCES mau_mo_3d(ma_mau_mo) ON UPDATE CASCADE ON DELETE RESTRICT,
    vi_tri_hang_o  VARCHAR(50) NOT NULL,
    trang_thai     VARCHAR(30) NOT NULL DEFAULT 'Trống'
                   CHECK (trang_thai IN ('Trống', 'Đã an táng', 'Đã đặt trước')),
    dien_tich_lo   NUMERIC(6, 2) NOT NULL CHECK (dien_tich_lo > 0),
    cao_do_z       NUMERIC(6, 2) NOT NULL DEFAULT 0,
    goc_xoay_z     NUMERIC(5, 2) NOT NULL DEFAULT 0,
    do_sau_huyet   NUMERIC(5, 2) NOT NULL DEFAULT 2.00,
    toa_do_x       NUMERIC(8, 2) NOT NULL DEFAULT 0,
    toa_do_z       NUMERIC(8, 2) NOT NULL DEFAULT 0,
    geom_3d        GEOMETRY(PolygonZ, 3405) NOT NULL,
    surfaces_sudm  JSONB NOT NULL DEFAULT '[]'::jsonb,
    topology_info  JSONB NOT NULL DEFAULT '{"khoang_cach_ke_can": 0.6, "hop_le_quy_hoach": true}'::jsonb,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. Bảng NguoiMat (Hồ sơ người mất gắn với lô đất)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nguoi_mat (
    ma_nguoi_mat         VARCHAR(30) PRIMARY KEY,
    ma_lo_dat            VARCHAR(30) NOT NULL UNIQUE REFERENCES lo_dat(ma_lo_dat) ON UPDATE CASCADE ON DELETE CASCADE,
    ho_ten               VARCHAR(100) NOT NULL,
    ngay_sinh            VARCHAR(20),
    ngay_mat             VARCHAR(20),
    ngay_an_tang         VARCHAR(20),
    thong_tin_than_nhan  VARCHAR(150),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. Bảng HaTang (Công trình hạ tầng & vùng đệm cách ly Buffer)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ha_tang (
    ma_ha_tang          VARCHAR(20) PRIMARY KEY,
    ma_phan_khu         VARCHAR(20) REFERENCES phan_khu(ma_phan_khu) ON UPDATE CASCADE ON DELETE SET NULL,
    ten_ha_tang         VARCHAR(100) NOT NULL,
    loai_ha_tang        VARCHAR(50) NOT NULL,
    dien_tich_xay_dung  NUMERIC(10, 2) NOT NULL CHECK (dien_tich_xay_dung >= 0),
    chieu_cao_3d        NUMERIC(6, 2) NOT NULL DEFAULT 0,
    ban_kinh_cach_ly    NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (ban_kinh_cach_ly >= 0),
    geom_3d             GEOMETRY(MultiPolygonZ, 3405) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 6. Bảng TuyenGiaoThong (Mạng lưới giao thông nội bộ 3D)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tuyen_giao_thong (
    ma_tuyen_duong    VARCHAR(20) PRIMARY KEY,
    ma_phan_khu       VARCHAR(20) REFERENCES phan_khu(ma_phan_khu) ON UPDATE CASCADE ON DELETE SET NULL,
    ten_tuyen_duong   VARCHAR(100) NOT NULL,
    loai_duong        VARCHAR(30) NOT NULL DEFAULT 'Lối đi bộ',
    chieu_rong_duong  NUMERIC(5, 2) NOT NULL CHECK (chieu_rong_duong > 0),
    dien_tich_duong   NUMERIC(10, 2) NOT NULL CHECK (dien_tich_duong >= 0),
    geom_3d           GEOMETRY(LineStringZ, 3405) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 7. Bảng QuanHeTopology (Lưu vết quan hệ Topology 3D: chứa trong / kề nhau / tiếp giáp)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quan_he_topology (
    ma_topology           BIGSERIAL PRIMARY KEY,
    ma_lo_dat_goc         VARCHAR(30) NOT NULL REFERENCES lo_dat(ma_lo_dat) ON UPDATE CASCADE ON DELETE CASCADE,
    ma_lo_dat_ke_can      VARCHAR(30) REFERENCES lo_dat(ma_lo_dat) ON UPDATE CASCADE ON DELETE CASCADE,
    ma_ha_tang_tiep_giap  VARCHAR(20) REFERENCES ha_tang(ma_ha_tang) ON UPDATE CASCADE ON DELETE CASCADE,
    ma_duong_tiep_giap    VARCHAR(20) REFERENCES tuyen_giao_thong(ma_tuyen_duong) ON UPDATE CASCADE ON DELETE CASCADE,
    loai_quan_he          VARCHAR(30) NOT NULL
                          CHECK (loai_quan_he IN ('CONTAINS', 'WITHIN', 'ADJACENT', 'TOUCHES', 'OVERLAPS', 'BUFFER_VIOLATION', 'ROAD_ACCESS')),
    khoang_cach_3d        NUMERIC(6, 2),
    hop_le_quy_hoach      BOOLEAN NOT NULL DEFAULT TRUE,
    checked_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_topology_target_not_all_null CHECK (
        ma_lo_dat_ke_can IS NOT NULL
        OR ma_ha_tang_tiep_giap IS NOT NULL
        OR ma_duong_tiep_giap IS NOT NULL
        OR loai_quan_he IN ('CONTAINS', 'WITHIN')
    )
);

-- -----------------------------------------------------------------------------
-- 8. Chỉ mục không gian R-Tree (GIST) & Chỉ mục thuộc tính (Chương 7 - Slide 19)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_phan_khu_geom_3d ON phan_khu USING GIST (geom_3d);
CREATE INDEX IF NOT EXISTS idx_lo_dat_geom_3d ON lo_dat USING GIST (geom_3d);
CREATE INDEX IF NOT EXISTS idx_ha_tang_geom_3d ON ha_tang USING GIST (geom_3d);
CREATE INDEX IF NOT EXISTS idx_tuyen_giao_thong_geom_3d ON tuyen_giao_thong USING GIST (geom_3d);

CREATE INDEX IF NOT EXISTS idx_lo_dat_phan_khu ON lo_dat (ma_phan_khu);
CREATE INDEX IF NOT EXISTS idx_lo_dat_trang_thai ON lo_dat (trang_thai);
CREATE INDEX IF NOT EXISTS idx_topology_lo_goc ON quan_he_topology (ma_lo_dat_goc);
CREATE INDEX IF NOT EXISTS idx_topology_hop_le ON quan_he_topology (hop_le_quy_hoach);
