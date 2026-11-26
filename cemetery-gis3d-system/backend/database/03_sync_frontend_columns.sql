-- =============================================================================
-- Bước 1 (Tùy chọn): Bổ sung 2 cột chuyên biệt 3D trên Supabase SQL Editor
-- (Backend v2.2.0 hoạt động an toàn cả trước và sau khi chạy 2 lệnh này)
-- =============================================================================

ALTER TABLE lo_dat
  ADD COLUMN IF NOT EXISTS do_sau_huyet NUMERIC(4, 2) DEFAULT 2.0;

ALTER TABLE mau_mo_3d
  ADD COLUMN IF NOT EXISTS surfaces JSONB DEFAULT '[
    {"id": "F_GROUND", "surfaceType": "GroundSurface", "label": "Móng bệ bê tông tiếp đất", "areaM2": 3.52},
    {"id": "F_WALL", "surfaceType": "WallSurface", "label": "4 Mặt tường bao thân mộ", "areaM2": 4.80},
    {"id": "F_ROOF", "surfaceType": "RoofSurface", "label": "Nắp mộ & Mặt bia đá", "areaM2": 2.95}
  ]'::jsonb;
