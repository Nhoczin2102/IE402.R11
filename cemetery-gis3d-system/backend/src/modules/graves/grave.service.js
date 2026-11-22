const db = require('../../config/database');
const graveRepository = require('./grave.repository');
const { GRAVE_STATUS } = require('../../constants/cemeteryConstants');
const AppError = require('../../utils/AppError');
const { toGeoJsonFeatureCollection } = require('../../utils/apiResponse');
const { getTerrainHeight, buildLotPolygonZWkt } = require('../../utils/terrainMath');
const { spatialCache } = require('../../utils/memoryCache');

const invalidateSpatialAnalyticsCache = () => {
  spatialCache.invalidatePrefix('zones:');
  spatialCache.invalidatePrefix('topology:');
};

const buildDefaultSudmSurfaces = (areaM2, heightM, lengthM, widthM) => [
  { id: 'F_GROUND', surfaceType: 'GroundSurface', label: 'Móng bệ bê tông tiếp đất', areaM2 },
  {
    id: 'F_WALL',
    surfaceType: 'WallSurface',
    label: '4 Mặt tường bao thân mộ',
    areaM2: Number((2 * (lengthM + widthM) * heightM).toFixed(2)),
  },
  { id: 'F_ROOF', surfaceType: 'RoofSurface', label: 'Nắp mộ & Mặt bia đá', areaM2 },
];

const formatGraveRow = (row, lod = 3) => {
  const baseLod1 = {
    ma_lo_dat: row.ma_lo_dat,
    ma_phan_khu: row.ma_phan_khu,
    trang_thai: row.trang_thai,
    dien_tich_lo: Number(row.dien_tich_lo),
    cao_do_z: Number(row.cao_do_z),
    goc_xoay_z: Number(row.goc_xoay_z || 0),
    chieu_cao_chuan: Number(row.chieu_cao_chuan || 1.1),
    position: [Number(row.toa_do_x), Number(row.cao_do_z), Number(row.toa_do_z)],
  };

  if (lod === 1) {
    return baseLod1;
  }

  const lod2 = {
    ...baseLod1,
    ma_mau_mo: row.ma_mau_mo,
    vi_tri_hang_o: row.vi_tri_hang_o,
    do_sau_huyet: Number(row.do_sau_huyet),
    ten_mau_mo: row.ten_mau_mo || 'Mộ đơn tiêu chuẩn',
    surfaces: Array.isArray(row.surfaces_sudm) ? row.surfaces_sudm : [],
    topology: row.topology_info || { khoang_cach_ke_can: 0.6, hop_le_quy_hoach: true },
  };

  if (lod === 2) {
    return lod2;
  }

  return {
    ...lod2,
    dien_tich_postgis_m2:
      row.dien_tich_postgis_m2 !== null ? Number(row.dien_tich_postgis_m2) : Number(row.dien_tich_lo),
    the_tich_khoi_3d_m3:
      row.the_tich_khoi_3d_m3 !== null ? Number(row.the_tich_khoi_3d_m3) : null,
    the_tich_ho_huyet_m3:
      row.the_tich_ho_huyet_m3 !== null ? Number(row.the_tich_ho_huyet_m3) : null,
    khoang_cach_ke_toi_thieu: Number(row.khoang_cach_ke_toi_thieu || 0.5),
    model_3d_url: row.model_3d_url || null,
    geojson: row.geojson || null,
    nguoi_mat: row.ho_ten
      ? {
          ma_nguoi_mat: row.ma_nguoi_mat,
          ho_ten: row.ho_ten,
          ngay_sinh: row.ngay_sinh || undefined,
          ngay_mat: row.ngay_mat || undefined,
          ngay_an_tang: row.ngay_an_tang || undefined,
          thong_tin_than_nhan: row.thong_tin_than_nhan || undefined,
        }
      : undefined,
  };
};

const listGraves = async (filters = {}) => {
  const lod = filters.lod || 3;
  const rows = await graveRepository.findAllGraves(filters);
  const formatted = rows.map((row) => formatGraveRow(row, filters.format === 'geojson' ? 3 : lod));

  if (filters.format === 'geojson') {
    return toGeoJsonFeatureCollection(formatted, 'geojson', 'ma_lo_dat');
  }
  return formatted;
};

const getGraveDetail = async (maLoDat) => {
  const row = await graveRepository.findGraveById(maLoDat);
  if (!row) {
    throw new AppError(`Không tìm thấy lô mộ có mã "${maLoDat}".`, 404, 'GRAVE_NOT_FOUND');
  }
  return formatGraveRow(row, 3);
};

/**
 * Quy hoạch thêm lô mộ 3D mới với cổng kiểm tra Topology tự động (Containment + Overlap + Clearance + Buffer).
 */
const createGraveWithTopologyCheck = async (payload) => {
  const created = await db.withTransaction(async (client) => {
    const template = await graveRepository.findGraveTemplateById(payload.ma_mau_mo, client);
    if (!template) {
      throw new AppError(
        `Không tìm thấy mẫu mộ 3D "${payload.ma_mau_mo}".`,
        404,
        'GRAVE_TEMPLATE_NOT_FOUND'
      );
    }

    const elevationZ =
      payload.cao_do_z !== undefined
        ? Number(payload.cao_do_z)
        : Number(getTerrainHeight(payload.toa_do_x, payload.toa_do_z).toFixed(2));

    const lengthM = Number(template.chieu_dai_chuan);
    const widthM = Number(template.chieu_rong_chuan);
    const heightM = Number(template.chieu_cao_chuan);
    const areaM2 = Number(template.dien_tich_chuan);
    const minClearance = Number(template.khoang_cach_ke_toi_thieu);

    const wktPolygonZ = buildLotPolygonZWkt(
      payload.toa_do_x,
      payload.toa_do_z,
      elevationZ,
      lengthM,
      widthM
    );

    const check = await graveRepository.validateCandidateGeometry(
      { maPhanKhu: payload.ma_phan_khu, wktPolygonZ, minClearance },
      client
    );

    if (!check.zoneExists) {
      throw new AppError(`Phân khu "${payload.ma_phan_khu}" không tồn tại.`, 404, 'ZONE_NOT_FOUND');
    }

    const violations = [];
    if (!check.isValidGeom) {
      violations.push({ rule: 'VALID_GEOMETRY', message: 'Hình học PolygonZ sinh ra không hợp lệ.' });
    }
    if (!check.isContained) {
      violations.push({
        rule: 'CONTAINMENT',
        message: `Lô mộ "${payload.ma_lo_dat}" nằm ngoài ranh giới phân khu "${payload.ma_phan_khu}".`,
      });
    }
    if (check.overlappingLots.length > 0) {
      violations.push({
        rule: 'NO_OVERLAP',
        message: `Chồng lấp không gian với các lô: ${check.overlappingLots.map((n) => n.ma_lo_dat).join(', ')}.`,
      });
    }
    if (check.tooCloseLots.length > 0) {
      violations.push({
        rule: 'MIN_CLEARANCE',
        message: `Vi phạm khoảng cách kề tối thiểu (${minClearance}m) với: ${check.tooCloseLots
          .map((n) => `${n.ma_lo_dat} (${n.khoang_cach_3d}m)`)
          .join(', ')}.`,
      });
    }
    if (check.bufferViolations.length > 0) {
      violations.push({
        rule: 'INFRASTRUCTURE_BUFFER',
        message: `Xâm phạm hành lang cách ly của hạ tầng: ${check.bufferViolations
          .map((b) => `${b.ten_ha_tang} (bán kính ${b.ban_kinh_cach_ly}m)`)
          .join(', ')}.`,
      });
    }

    if (violations.length > 0) {
      throw new AppError(
        'Không thể quy hoạch lô mộ mới do vi phạm quy tắc Topology 3D.',
        422,
        'TOPOLOGY_VIOLATION',
        violations
      );
    }

    const nearestDistance =
      check.neighbors.length > 0 ? Number(check.neighbors[0].khoang_cach_3d) : minClearance;

    const surfacesSudm =
      payload.surfaces_sudm && payload.surfaces_sudm.length > 0
        ? payload.surfaces_sudm
        : buildDefaultSudmSurfaces(areaM2, heightM, lengthM, widthM);

    await graveRepository.insertGraveLot(
      {
        ma_lo_dat: payload.ma_lo_dat,
        ma_phan_khu: payload.ma_phan_khu,
        ma_mau_mo: payload.ma_mau_mo,
        vi_tri_hang_o: payload.vi_tri_hang_o,
        dien_tich_lo: areaM2,
        cao_do_z: elevationZ,
        goc_xoay_z: payload.goc_xoay_z ?? 0,
        do_sau_huyet: payload.do_sau_huyet ?? 2.0,
        toa_do_x: payload.toa_do_x,
        toa_do_z: payload.toa_do_z,
        wktPolygonZ,
        surfaces_sudm: surfacesSudm,
        topology_info: {
          khoang_cach_ke_can: nearestDistance,
          hop_le_quy_hoach: true,
        },
      },
      client
    );

    // Ghi nhận tối đa 3 quan hệ kề cận gần nhất vào bảng quan_he_topology hiện có
    for (const neighbor of check.neighbors.slice(0, 3)) {
      await graveRepository.insertAdjacentTopologyRelation(
        {
          maLoDatGoc: payload.ma_lo_dat,
          maLoDatKeCan: neighbor.ma_lo_dat,
          khoangCach3d: Number(neighbor.khoang_cach_3d),
          hopLe: true,
        },
        client
      );
    }

    const row = await graveRepository.findGraveById(payload.ma_lo_dat, client);
    return formatGraveRow(row, 3);
  });

  invalidateSpatialAnalyticsCache();
  return created;
};

const allocateGrave = async ({
  ma_lo_dat,
  trang_thai,
  ho_ten,
  ngay_sinh,
  ngay_mat,
  ngay_an_tang,
  thong_tin_than_nhan,
}) => {
  const allocated = await db.withTransaction(async (client) => {
    const existing = await graveRepository.findGraveStatusForUpdate(ma_lo_dat, client);
    if (!existing) {
      throw new AppError(`Mã lô đất "${ma_lo_dat}" không tồn tại.`, 404, 'GRAVE_NOT_FOUND');
    }
    if (existing.trang_thai !== GRAVE_STATUS.EMPTY) {
      throw new AppError(
        `Lô đất "${ma_lo_dat}" hiện đang ở trạng thái "${existing.trang_thai}", không thể cấp phát mới.`,
        409,
        'GRAVE_ALREADY_ALLOCATED'
      );
    }

    await graveRepository.updateGraveStatus(ma_lo_dat, trang_thai, client);

    const displayName =
      trang_thai === GRAVE_STATUS.RESERVED && !ho_ten.includes('(Đặt trước)')
        ? `${ho_ten} (Đặt trước)`
        : ho_ten;

    const resolvedBurialDate =
      ngay_an_tang ||
      (trang_thai === GRAVE_STATUS.OCCUPIED ? new Date().toLocaleDateString('vi-VN') : null);

    const maNguoiMat = `NM-${ma_lo_dat.replace(/[^a-zA-Z0-9]/g, '')}`;

    await graveRepository.upsertOccupant(
      {
        ma_nguoi_mat: maNguoiMat,
        ma_lo_dat,
        ho_ten: displayName,
        ngay_sinh,
        ngay_mat,
        ngay_an_tang: resolvedBurialDate,
        thong_tin_than_nhan,
      },
      client
    );

    const updated = await graveRepository.findGraveById(ma_lo_dat, client);
    return formatGraveRow(updated, 3);
  });

  invalidateSpatialAnalyticsCache();
  return allocated;
};

const updateGraveLifecycle = async (
  maLoDat,
  { trang_thai, ho_ten, ngay_sinh, ngay_mat, ngay_an_tang, thong_tin_than_nhan }
) => {
  const updatedLot = await db.withTransaction(async (client) => {
    const existing = await graveRepository.findGraveStatusForUpdate(maLoDat, client);
    if (!existing) {
      throw new AppError(`Mã lô đất "${maLoDat}" không tồn tại.`, 404, 'GRAVE_NOT_FOUND');
    }

    await graveRepository.updateGraveStatus(maLoDat, trang_thai, client);

    if (trang_thai === GRAVE_STATUS.EMPTY) {
      await graveRepository.deleteOccupantByGraveId(maLoDat, client);
    } else {
      const cleanedName =
        trang_thai === GRAVE_STATUS.OCCUPIED
          ? ho_ten.replace(/\s*\(Đặt trước\)\s*/g, '').trim()
          : ho_ten;

      const resolvedBurialDate =
        ngay_an_tang ||
        (trang_thai === GRAVE_STATUS.OCCUPIED ? new Date().toLocaleDateString('vi-VN') : null);

      const maNguoiMat = `NM-${maLoDat.replace(/[^a-zA-Z0-9]/g, '')}`;

      await graveRepository.upsertOccupant(
        {
          ma_nguoi_mat: maNguoiMat,
          ma_lo_dat: maLoDat,
          ho_ten: cleanedName,
          ngay_sinh,
          ngay_mat,
          ngay_an_tang: resolvedBurialDate,
          thong_tin_than_nhan,
        },
        client
      );
    }

    const updated = await graveRepository.findGraveById(maLoDat, client);
    return formatGraveRow(updated, 3);
  });

  invalidateSpatialAnalyticsCache();
  return updatedLot;
};

const exportGravesCsv = async (filters = {}) => {
  const graves = await listGraves({ ...filters, format: 'json', lod: 3 });
  const headers = [
    'MaLoDat',
    'PhanKhu',
    'ViTriHangO',
    'TrangThai',
    'CaoDoZ(m)',
    'DienTich(m2)',
    'TheTichKhoi3D(m3)',
    'MauMo3D',
    'HoTenNguoiMat',
    'NgayAnTang',
    'ThanNhan',
  ];

  const escapeCsvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  const lines = graves.map((g) =>
    [
      g.ma_lo_dat,
      g.ma_phan_khu,
      g.vi_tri_hang_o,
      g.trang_thai,
      g.cao_do_z,
      g.dien_tich_lo,
      g.the_tich_khoi_3d_m3 ?? '',
      g.ten_mau_mo,
      g.nguoi_mat?.ho_ten || '',
      g.nguoi_mat?.ngay_an_tang || '',
      g.nguoi_mat?.thong_tin_than_nhan || '',
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  return `\uFEFF${[headers.join(','), ...lines].join('\n')}`;
};

module.exports = {
  listGraves,
  getGraveDetail,
  createGraveWithTopologyCheck,
  allocateGrave,
  updateGraveLifecycle,
  exportGravesCsv,
  buildLotPolygonZWkt,
};
