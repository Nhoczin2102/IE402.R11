const zoneRepository = require('./zone.repository');
const infrastructureRepository = require('./infrastructure.repository');
const AppError = require('../../utils/AppError');
const { toGeoJsonFeatureCollection } = require('../../utils/apiResponse');

const listZones = async (format = 'json') => {
  const rows = await zoneRepository.findAllZones();
  const normalized = rows.map((r) => ({
    ma_phan_khu: r.ma_phan_khu,
    ten_phan_khu: r.ten_phan_khu,
    loai_phan_khu: r.loai_phan_khu,
    dien_tich_khu: Number(r.dien_tich_khu),
    dien_tich_postgis_m2: Number(r.dien_tich_postgis_m2),
    mat_do_mo_toi_da: Number(r.mat_do_mo_toi_da),
    cao_do_nen_tb: Number(r.cao_do_nen_tb || 0),
    geojson: r.geojson,
  }));

  if (format === 'geojson') {
    return toGeoJsonFeatureCollection(normalized, 'geojson', 'ma_phan_khu');
  }
  return normalized;
};

const computeZoneCapacityReport = async (maPhanKhu = null) => {
  const rows = await zoneRepository.getZoneCapacityAnalytics(maPhanKhu);
  if (maPhanKhu && rows.length === 0) {
    throw new AppError(`Không tìm thấy phân khu "${maPhanKhu}".`, 404, 'ZONE_NOT_FOUND');
  }

  const zones = rows.map((row) => {
    const dienTichHinhHoc = Number(row.dien_tich_hinh_hoc_m2 || row.dien_tich_quy_hoach_m2);
    const matDoToiDa = Number(row.mat_do_mo_toi_da) || 65;
    const dienTichLoaiTru = Number(row.dien_tich_loai_tru_tong_m2);
    const tongDienTichLoHienHuu = Number(row.tong_dien_tich_lo_m2);
    const dienTichDaSuDung = Number(row.dien_tich_da_su_dung_m2);
    const dienTichMoChuan = Number(row.dien_tich_mo_chuan_tb_m2) || 3.3;

    // 1. Diện tích đất xây dựng mộ tối đa theo chỉ tiêu mật độ (sau khi đã trừ giao thông & hạ tầng hợp nhất)
    const dienTichDatThuan = Math.max(0, dienTichHinhHoc - dienTichLoaiTru);
    const dienTichKhaDungTong = Number((dienTichDatThuan * (matDoToiDa / 100)).toFixed(2));

    // 2. Quỹ đất khả dụng còn lại chưa chia lô (trừ toàn bộ diện tích các lô đã vạch ranh)
    const dienTichConLai = Math.max(0, Number((dienTichKhaDungTong - tongDienTichLoHienHuu).toFixed(2)));

    // 3. Sức chứa ước tính có thể quy hoạch thêm trên phần đất chưa chia lô
    const sucChuaMoRongThem = Math.floor(dienTichConLai / dienTichMoChuan);
    const tongSoLoHienHuu = Number(row.tong_so_lo);
    const soLoTrongHienHuu = Number(row.so_lo_trong);
    const daDungHoacDatTruoc = Number(row.so_lo_da_an_tang) + Number(row.so_lo_dat_truoc);

    const tyLeLapDayHienHuu =
      tongSoLoHienHuu > 0 ? Number(((daDungHoacDatTruoc / tongSoLoHienHuu) * 100).toFixed(2)) : 0;

    return {
      ma_phan_khu: row.ma_phan_khu,
      ten_phan_khu: row.ten_phan_khu,
      loai_phan_khu: row.loai_phan_khu,
      dien_tich_quy_hoach_m2: Number(row.dien_tich_quy_hoach_m2),
      dien_tich_hinh_hoc_postgis_m2: dienTichHinhHoc,
      dien_tich_loai_tru_ha_tang_giao_thong_m2: dienTichLoaiTru,
      mat_do_mo_toi_da_phan_tram: matDoToiDa,
      dien_tich_kha_dung_tong_m2: dienTichKhaDungTong,
      tong_dien_tich_da_phan_lo_m2: tongDienTichLoHienHuu,
      dien_tich_da_su_dung_m2: dienTichDaSuDung,
      dien_tich_con_lai_m2: dienTichConLai,
      thong_ke_lo_hien_huu: {
        tong_so_lo: tongSoLoHienHuu,
        so_lo_trong: soLoTrongHienHuu,
        so_lo_da_an_tang: Number(row.so_lo_da_an_tang),
        so_lo_dat_truoc: Number(row.so_lo_dat_truoc),
        ty_le_lap_day_phan_tram: tyLeLapDayHienHuu,
      },
      suc_chua_quy_hoach: {
        dien_tich_mo_chuan_tb_m2: dienTichMoChuan,
        suc_chua_toi_da_uoc_tinh: tongSoLoHienHuu + sucChuaMoRongThem,
        suc_chua_con_lai_uoc_tinh: sucChuaMoRongThem,
        tong_kha_nang_tiep_nhan_moi: soLoTrongHienHuu + sucChuaMoRongThem,
      },
    };
  });

  const summary = zones.reduce(
    (acc, z) => {
      acc.tong_dien_tich_postgis_m2 = Number(
        (acc.tong_dien_tich_postgis_m2 + z.dien_tich_hinh_hoc_postgis_m2).toFixed(2)
      );
      acc.tong_dien_tich_con_lai_m2 = Number(
        (acc.tong_dien_tich_con_lai_m2 + z.dien_tich_con_lai_m2).toFixed(2)
      );
      acc.tong_so_lo += z.thong_ke_lo_hien_huu.tong_so_lo;
      acc.tong_lo_trong += z.thong_ke_lo_hien_huu.so_lo_trong;
      acc.tong_lo_da_an_tang += z.thong_ke_lo_hien_huu.so_lo_da_an_tang;
      acc.tong_lo_dat_truoc += z.thong_ke_lo_hien_huu.so_lo_dat_truoc;
      acc.tong_suc_chua_con_lai_uoc_tinh += z.suc_chua_quy_hoach.suc_chua_con_lai_uoc_tinh;
      return acc;
    },
    {
      tong_dien_tich_postgis_m2: 0,
      tong_dien_tich_con_lai_m2: 0,
      tong_so_lo: 0,
      tong_lo_trong: 0,
      tong_lo_da_an_tang: 0,
      tong_lo_dat_truoc: 0,
      tong_suc_chua_con_lai_uoc_tinh: 0,
    }
  );

  return maPhanKhu ? zones[0] : { summary, zones };
};

const listInfrastructure = async (format = 'json') => {
  const rows = await infrastructureRepository.findAllInfrastructures();
  if (format === 'geojson') {
    return toGeoJsonFeatureCollection(rows, 'geojson', 'ma_ha_tang');
  }
  return rows;
};

const listRoadSegments = async (format = 'json') => {
  const rows = await infrastructureRepository.findAllRoadSegments();
  if (format === 'geojson') {
    return toGeoJsonFeatureCollection(rows, 'geojson', 'ma_tuyen_duong');
  }
  return rows;
};

module.exports = {
  listZones,
  computeZoneCapacityReport,
  listInfrastructure,
  listRoadSegments,
};