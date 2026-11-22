const graveService = require('./grave.service');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/apiResponse');

// Giữ nguyên định dạng mảng JSON mặc định để tương thích 100% với Frontend hiện tại
const getAllGraves = asyncHandler(async (req, res) => {
  const result = await graveService.listGraves(req.query);
  return res.status(200).json(result);
});

const getGraveById = asyncHandler(async (req, res) => {
  const grave = await graveService.getGraveDetail(req.params.ma_lo_dat);
  return sendSuccess(res, grave);
});

const createGrave = asyncHandler(async (req, res) => {
  const created = await graveService.createGraveWithTopologyCheck(req.body);
  return res.status(201).json({
    success: true,
    message: `Đã quy hoạch lô mộ 3D "${created.ma_lo_dat}" hợp lệ về Topology.`,
    data: created,
  });
});

const allocateGrave = asyncHandler(async (req, res) => {
  const allocated = await graveService.allocateGrave(req.body);
  return res.status(201).json({
    success: true,
    message: `Đã cấp phát lô mộ ${allocated.ma_lo_dat} thành công.`,
    data: allocated,
  });
});

const updateGrave = asyncHandler(async (req, res) => {
  const updated = await graveService.updateGraveLifecycle(req.params.ma_lo_dat, req.body);
  return res.status(200).json({
    success: true,
    message: `Đã cập nhật trạng thái lô mộ ${updated.ma_lo_dat} thành công.`,
    data: updated,
  });
});

const exportGravesCsv = asyncHandler(async (req, res) => {
  const csvContent = await graveService.exportGravesCsv(req.query);
  const fileName = `BaoCao_QuyHoach_NghiaTrang3D_${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  return res.status(200).send(csvContent);
});

module.exports = {
  getAllGraves,
  getGraveById,
  createGrave,
  allocateGrave,
  updateGrave,
  exportGravesCsv,
};
