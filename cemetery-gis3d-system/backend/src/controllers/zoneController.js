const zoneService = require('../services/zoneService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

const getAllZones = asyncHandler(async (req, res) => {
  const format = req.query.format === 'geojson' ? 'geojson' : 'json';
  const data = await zoneService.listZones(format);
  if (format === 'geojson') {
    return res.status(200).json(data);
  }
  return sendSuccess(res, data);
});

const getAllZonesCapacity = asyncHandler(async (req, res) => {
  const report = await zoneService.computeZoneCapacityReport();
  return sendSuccess(res, report);
});

const getZoneCapacityById = asyncHandler(async (req, res) => {
  const report = await zoneService.computeZoneCapacityReport(req.params.ma_phan_khu);
  return sendSuccess(res, report);
});

const getAllInfrastructure = asyncHandler(async (req, res) => {
  const format = req.query.format === 'geojson' ? 'geojson' : 'json';
  const data = await zoneService.listInfrastructure(format);
  if (format === 'geojson') {
    return res.status(200).json(data);
  }
  return sendSuccess(res, data);
});

const getAllRoads = asyncHandler(async (req, res) => {
  const format = req.query.format === 'geojson' ? 'geojson' : 'json';
  const data = await zoneService.listRoadSegments(format);
  if (format === 'geojson') {
    return res.status(200).json(data);
  }
  return sendSuccess(res, data);
});

module.exports = {
  getAllZones,
  getAllZonesCapacity,
  getZoneCapacityById,
  getAllInfrastructure,
  getAllRoads,
};
