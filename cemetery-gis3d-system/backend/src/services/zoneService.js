const zoneRepository = require('../repositories/zoneRepository');
const infrastructureRepository = require('../repositories/infrastructureRepository');
const AppError = require('../utils/AppError');
const { toGeoJsonFeatureCollection } = require('../utils/apiResponse');

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
    const matDoToiDa = Number(row.mat_do_mo_toi_da);
    const dienTichHaTang = Number(row.dien_tich_ha_tang_va_cach_ly_m2);
    const dienTichGiaoThong = Number(row.dien_tich_giao_thong_m2);
    const dienTichDaSuDung = Number(row.dien_tich_da_su_dung_m2);
    const dienTichMoChuan = Number(row.dien_tich_mo_chuan_tb_m2) || 3.52;

    // Diện tích quy hoạch được phép bố trí mộ theo mật độ tối đa sau khi trừ hạ tầng & giao thông
    const dienTichKhaDungTong = Math.max(
      0,
      Number(((dienTichHinhHoc - dienTichHaTang - dienTichGiaoThong) * (matDoToiDa / 100)).toFixed(2))
    );
    const dienTichConLai = Math.max(0, Number((dienTichKhaDungTong - dienTichDaSuDung).toFixed(2)));

    const sucChuaToiDaUocTinh = Math.floor(dienTichKhaDungTong / dienTichMoChuan);
    const daDungHoacDatTruoc = Number(row.so_lo_da_an_tang) + Number(row.so_lo_dat_truoc);
    const sucChuaConLaiUocTinh = Math.max(0, sucChuaToiDaUocTinh - daDungHoacDatTruoc);
    const tyLeLapDayHienHuu =
      row.tong_so_lo > 0 ? Number(((daDungHoacDatTruoc / row.tong_so_lo) * 100).toFixed(2)) : 0;

    return {
      ma_phan_khu: row.ma_phan_khu,
      ten_phan_khu: row.ten_phan_khu,
      loai_phan_khu: row.loai_phan_khu,
      dien_tich_quy_hoach_m2: Number(row.dien_tich_quy_hoach_m2),
      dien_tich_hinh_hoc_postgis_m2: dienTichHinhHoc,
      dien_tich_ha_tang_va_cach_ly_m2: dienTichHaTang,
      dien_tich_giao_thong_m2: dienTichGiaoThong,
      mat_do_mo_toi_da_phan_tram: matDoToiDa,
      dien_tich_kha_dung_tong_m2: dienTichKhaDungTong,
      dien_tich_da_su_dung_m2: dienTichDaSuDung,
      dien_tich_con_lai_m2: dienTichConLai,
      thong_ke_lo_hien_huu: {
        tong_so_lo: Number(row.tong_so_lo),
        so_lo_trong: Number(row.so_lo_trong),
        so_lo_da_an_tang: Number(row.so_lo_da_an_tang),
        so_lo_dat_truoc: Number(row.so_lo_dat_truoc),
        ty_le_lap_day_phan_tram: tyLeLapDayHienHuu,
      },
      suc_chua_quy_hoach: {
        dien_tich_mo_chuan_tb_m2: dienTichMoChuan,
        suc_chua_toi_da_uoc_tinh: sucChuaToiDaUocTinh,
        suc_chua_con_lai_uoc_tinh: sucChuaConLaiUocTinh,
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
