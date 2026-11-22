const topologyRepository = require('../repositories/topologyRepository');
const AppError = require('../utils/AppError');

/**
 * Kiểm tra đầy đủ Topology 3D cho một lô mộ cụ thể:
 * 1. Containment (ST_Contains / ST_Within): Lô mộ nằm trọn trong phân khu.
 * 2. Adjacency & Clearance (ST_3DDistance / ST_Touches / ST_Overlaps): Khoảng cách kề cận tối thiểu.
 * 3. Buffer Analysis (ST_Buffer): Không xâm phạm hành lang cách ly hạ tầng.
 */
const inspectGraveTopology = async (maLoDat, searchRadiusMeters = 10) => {
  const containment = await topologyRepository.checkLotContainment(maLoDat);
  if (!containment) {
    throw new AppError(`Không tìm thấy lô mộ "${maLoDat}" để kiểm tra topology.`, 404, 'GRAVE_NOT_FOUND');
  }

  const [adjacentLots, infrastructureBuffers] = await Promise.all([
    topologyRepository.checkAdjacentLots(maLoDat, searchRadiusMeters),
    topologyRepository.checkInfrastructureBuffers(maLoDat),
  ]);

  const neighborDetails = adjacentLots.map((n) => {
    const dist3d = Number(n.khoang_cach_3d);
    const minRequired = Number(n.khoang_cach_ke_toi_thieu);
    const isDistanceValid = !n.is_overlapping && dist3d >= minRequired;
    return {
      ma_lo_dat_ke_can: n.ma_lo_dat_ke_can,
      ma_phan_khu: n.ma_phan_khu,
      trang_thai: n.trang_thai,
      khoang_cach_3d_m: dist3d,
      khoang_cach_2d_m: Number(n.khoang_cach_2d),
      khoang_cach_ke_toi_thieu_m: minRequired,
      is_touching: Boolean(n.is_touching),
      is_overlapping: Boolean(n.is_overlapping),
      hop_le_khoang_cach: isDistanceValid,
    };
  });

  const bufferDetails = infrastructureBuffers.map((b) => ({
    ma_ha_tang: b.ma_ha_tang,
    ten_ha_tang: b.ten_ha_tang,
    loai_ha_tang: b.loai_ha_tang,
    ban_kinh_cach_ly_m: Number(b.ban_kinh_cach_ly),
    khoang_cach_3d_m: Number(b.khoang_cach_3d),
    vi_pham_vung_dem: Boolean(b.violates_buffer),
  }));

  const isContained = Boolean(containment.is_contained_in_zone && containment.is_within_zone);
  const hasNeighborViolation = neighborDetails.some((n) => !n.hop_le_khoang_cach);
  const hasBufferViolation = bufferDetails.some((b) => b.vi_pham_vung_dem);

  return {
    ma_lo_dat: containment.ma_lo_dat,
    ma_phan_khu: containment.ma_phan_khu,
    ten_phan_khu: containment.ten_phan_khu,
    hop_le_tong_the: isContained && !hasNeighborViolation && !hasBufferViolation,
    containment: {
      is_contained_in_zone: Boolean(containment.is_contained_in_zone),
      is_within_zone: Boolean(containment.is_within_zone),
      hop_le: isContained,
    },
    adjacency: {
      ban_kinh_kiem_tra_m: searchRadiusMeters,
      so_lo_lan_can: neighborDetails.length,
      khoang_cach_gan_nhat_m: neighborDetails.length > 0 ? neighborDetails[0].khoang_cach_3d_m : null,
      co_vi_pham: hasNeighborViolation,
      danh_sach_ke_can: neighborDetails,
    },
    infrastructure_buffer: {
      co_vi_pham: hasBufferViolation,
      chi_tiet: bufferDetails,
    },
  };
};

const runFullTopologyAudit = async () => {
  const raw = await topologyRepository.auditAllTopology();
  const totalViolations =
    raw.containmentViolations.length +
    raw.overlapViolations.length +
    raw.bufferViolations.length;

  return {
    hop_le_toan_khu: totalViolations === 0,
    tong_so_vi_pham: totalViolations,
    vi_pham_chua_trong_phan_khu: raw.containmentViolations,
    vi_pham_chong_lap_lo_mo: raw.overlapViolations,
    vi_pham_vung_dem_ha_tang: raw.bufferViolations,
  };
};

const listStoredTopologyRelations = async (maLoDat = null) =>
  topologyRepository.findStoredTopologyRelations(maLoDat);

module.exports = {
  inspectGraveTopology,
  runFullTopologyAudit,
  listStoredTopologyRelations,
};
