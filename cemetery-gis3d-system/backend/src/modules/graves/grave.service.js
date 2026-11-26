const db = require('../../config/database');
const graveRepository = require('./grave.repository');
const {
  GRAVE_STATUS,
  DB_GRAVE_STATUS,
  DB_TO_UI_STATUS,
  UI_TO_DB_STATUS,
  ZONE_CODE_TO_UI_LABEL,
  UI_LABEL_TO_ZONE_CODE,
  DEFAULT_SUDM_SURFACES,
} = require('../../constants/cemeteryConstants');
const AppError = require('../../utils/AppError');
const { toGeoJsonFeatureCollection } = require('../../utils/apiResponse');
const { getTerrainHeight } = require('../../utils/terrainMath');
const { spatialCache } = require('../../utils/memoryCache');

const invalidateSpatialAnalyticsCache = () => {
  spatialCache.invalidatePrefix('zones:');
  spatialCache.invalidatePrefix('topology:');
};

/**
 * Chuẩn hóa chuỗi ngày (DD/MM/YYYY hoặc YYYY-MM-DD) sang định dạng ISO YYYY-MM-DD.
 */
const normalizeToIsoDate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const vnMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (vnMatch) {
    const [, dd, mm, yyyy] = vnMatch;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return trimmed;
};

/**
 * Định dạng hiển thị DD/MM/YYYY an toàn cho cả kiểu cột VARCHAR lẫn DATE từ PostgreSQL.
 */
const formatDisplayDate = (value) => {
  if (!value) return undefined;
  const str = String(value).trim();
  if (!str) return undefined;
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  return str;
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

/**
 * Tự nhận diện bảng lo_dat hiện tại đang dùng mã không dấu ('TRONG') hay tiếng Việt ('Trống')
 * dựa trên trạng thái hiện hữu của bản ghi để không bao giờ vướng CHECK constraint.
 */
const resolveDbStatusValue = (requestedStatus, existingDbStatus = null) => {
  const usesUppercaseCodes =
    existingDbStatus && ['TRONG', 'DA_AN_TANG', 'DA_DAT_TRUOC'].includes(existingDbStatus);
  if (usesUppercaseCodes) {
    return UI_TO_DB_STATUS[requestedStatus] || requestedStatus;
  }
  return DB_TO_UI_STATUS[requestedStatus] || requestedStatus;
};

const isEmptyStatus = (status) =>
  status === GRAVE_STATUS.EMPTY || status === DB_GRAVE_STATUS.EMPTY;

const isOccupiedStatus = (status) =>
  status === GRAVE_STATUS.OCCUPIED || status === DB_GRAVE_STATUS.OCCUPIED;

const isReservedStatus = (status) =>
  status === GRAVE_STATUS.RESERVED || status === DB_GRAVE_STATUS.RESERVED;

const formatGraveRow = (row, lod = 3) => {
  const posX = Number(row.pos_x ?? 0);
  const posZ = Number(row.pos_z ?? 0);
  const terrainY = Number(getTerrainHeight(posX, posZ).toFixed(2));
  const uiStatus = DB_TO_UI_STATUS[row.trang_thai] || row.trang_thai;
  const uiZone = ZONE_CODE_TO_UI_LABEL[row.ma_phan_khu] || row.ma_phan_khu;

  const baseLod1 = {
    ma_lo_dat: row.ma_lo_dat,
    ma_phan_khu: uiZone,
    ma_phan_khu_goc: row.ma_phan_khu,
    ten_phan_khu: row.ten_phan_khu || uiZone,
    trang_thai: uiStatus,
    dien_tich_lo: Number(row.dien_tich_lo),
    cao_do_z: terrainY,
    cao_do_z_db: Number(row.cao_do_z),
    goc_xoay_z: Number(row.goc_xoay_z || 0),
    chieu_cao_chuan: Number(row.chieu_cao_chuan || 1.1),
    position: [posX, terrainY, posZ],
  };

  if (lod === 1) {
    return baseLod1;
  }

  const parsedSurfaces =
    Array.isArray(row.surfaces) && row.surfaces.length > 0
      ? row.surfaces
      : DEFAULT_SUDM_SURFACES;

  const topoObj =
    row.topology_info && typeof row.topology_info === 'object'
      ? row.topology_info
      : {
          khoang_cach_ke_can: Number(row.topo_khoang_cach_ke_can ?? 0.6),
          hop_le_quy_hoach: Boolean(row.topo_hop_le_quy_hoach ?? true),
        };

  const lod2 = {
    ...baseLod1,
    ma_mau_mo: row.ma_mau_mo,
    vi_tri_hang_o: row.vi_tri_hang_o,
    do_sau_huyet: Number(row.do_sau_huyet ?? 2.0),
    ten_mau_mo: row.ten_mau_mo || 'Mộ đơn tiêu chuẩn',
    surfaces: parsedSurfaces,
    topology: topoObj,
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
          ngay_sinh: formatDisplayDate(row.ngay_sinh),
          ngay_mat: formatDisplayDate(row.ngay_mat),
          ngay_an_tang: formatDisplayDate(row.ngay_an_tang),
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

const createGraveWithTopologyCheck = async (payload) => {
  const resolvedZoneCode = UI_LABEL_TO_ZONE_CODE[payload.ma_phan_khu] || payload.ma_phan_khu;

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
    const areaM2 = Number(template.dien_tich_chuan);
    const minClearance = Number(template.khoang_cach_ke_toi_thieu);

    const check = await graveRepository.validateCandidateLot(
      {
        maPhanKhu: resolvedZoneCode,
        centerX: payload.toa_do_x,
        centerZ: payload.toa_do_z,
        lengthM,
        widthM,
        elevationZ,
        minClearance,
      },
      client
    );

    if (!check.zoneExists) {
      throw new AppError(`Phân khu "${resolvedZoneCode}" không tồn tại.`, 404, 'ZONE_NOT_FOUND');
    }

    const violations = [];
    if (!check.isValidGeom) {
      violations.push({ rule: 'VALID_GEOMETRY', message: 'Hình học PolygonZ sinh ra không hợp lệ.' });
    }
    if (!check.isContained) {
      violations.push({
        rule: 'CONTAINMENT',
        message: `Lô mộ "${payload.ma_lo_dat}" nằm ngoài ranh giới phân khu "${resolvedZoneCode}".`,
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

    await graveRepository.insertGraveLot(
      {
        ma_lo_dat: payload.ma_lo_dat,
        ma_phan_khu: resolvedZoneCode,
        ma_mau_mo: payload.ma_mau_mo,
        vi_tri_hang_o: payload.vi_tri_hang_o,
        dien_tich_lo: areaM2,
        cao_do_z: elevationZ,
        goc_xoay_z: payload.goc_xoay_z ?? 0,
        centerX: payload.toa_do_x,
        centerZ: payload.toa_do_z,
        lengthM,
        widthM,
        srid: check.srid,
        dbEmptyStatus: check.srid === 4326 ? DB_GRAVE_STATUS.EMPTY : GRAVE_STATUS.EMPTY,
      },
      client
    );

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
    if (!isEmptyStatus(existing.trang_thai)) {
      const currentUiStatus = DB_TO_UI_STATUS[existing.trang_thai] || existing.trang_thai;
      throw new AppError(
        `Lô đất "${ma_lo_dat}" hiện đang ở trạng thái "${currentUiStatus}", không thể cấp phát mới.`,
        409,
        'GRAVE_ALREADY_ALLOCATED'
      );
    }

    const dbStatus = resolveDbStatusValue(trang_thai, existing.trang_thai);
    await graveRepository.updateGraveStatus(ma_lo_dat, dbStatus, client);

    const displayName =
      isReservedStatus(trang_thai) && !ho_ten.includes('(Đặt trước)')
        ? `${ho_ten} (Đặt trước)`
        : ho_ten;

    const resolvedBurialDate =
      normalizeToIsoDate(ngay_an_tang) || (isOccupiedStatus(trang_thai) ? todayIsoDate() : null);

    const maNguoiMat = `NM-${ma_lo_dat.replace(/[^a-zA-Z0-9]/g, '')}`.slice(0, 30);

    await graveRepository.upsertOccupant(
      {
        ma_nguoi_mat: maNguoiMat,
        ma_lo_dat,
        ho_ten: displayName,
        ngay_sinh: normalizeToIsoDate(ngay_sinh),
        ngay_mat: normalizeToIsoDate(ngay_mat),
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

    const dbStatus = resolveDbStatusValue(trang_thai, existing.trang_thai);
    await graveRepository.updateGraveStatus(maLoDat, dbStatus, client);

    if (isEmptyStatus(trang_thai)) {
      await graveRepository.deleteOccupantByGraveId(maLoDat, client);
    } else {
      const cleanedName = isOccupiedStatus(trang_thai)
        ? ho_ten.replace(/\s*\(Đặt trước\)\s*/g, '').trim()
        : ho_ten;

      const resolvedBurialDate =
        normalizeToIsoDate(ngay_an_tang) || (isOccupiedStatus(trang_thai) ? todayIsoDate() : null);

      const maNguoiMat = `NM-${maLoDat.replace(/[^a-zA-Z0-9]/g, '')}`.slice(0, 30);

      await graveRepository.upsertOccupant(
        {
          ma_nguoi_mat: maNguoiMat,
          ma_lo_dat: maLoDat,
          ho_ten: cleanedName,
          ngay_sinh: normalizeToIsoDate(ngay_sinh),
          ngay_mat: normalizeToIsoDate(ngay_mat),
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
  normalizeToIsoDate,
  formatDisplayDate,
};
