const zoneService = require('./zone.service');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/apiResponse');
const { spatialCache } = require('../../utils/memoryCache');

const getAllZones = asyncHandler(async (req, res) => {
  const format = req.query.format === 'geojson' ? 'geojson' : 'json';
  const data = await zoneService.listZones(format);
  if (format === 'geojson') {
    return res.status(200).json(data);
  }
  return sendSuccess(res, data);
});

const getAllZonesCapacity = asyncHandler(async (req, res) => {
  const cacheKey = 'zones:capacity:all';
  const cached = spatialCache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return sendSuccess(res, cached);
  }

  const report = await zoneService.computeZoneCapacityReport();
  spatialCache.set(cacheKey, report);
  res.setHeader('X-Cache', 'MISS');
  return sendSuccess(res, report);
});

const getZoneCapacityById = asyncHandler(async (req, res) => {
  const cacheKey = `zones:capacity:${req.params.ma_phan_khu}`;
  const cached = spatialCache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return sendSuccess(res, cached);
  }

  const report = await zoneService.computeZoneCapacityReport(req.params.ma_phan_khu);
  spatialCache.set(cacheKey, report);
  res.setHeader('X-Cache', 'MISS');
  return sendSuccess(res, report);
});

const getAllInfrastructure = asyncHandler(async (req, res) => {
  const format = req.query.format === 'geojson' ? 'geojson' : 'json';
  const cacheKey = `zones:infrastructure:${format}`;
  const cached = spatialCache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return format === 'geojson' ? res.status(200).json(cached) : sendSuccess(res, cached);
  }

  const data = await zoneService.listInfrastructure(format);
  spatialCache.set(cacheKey, data, 60000);
  res.setHeader('X-Cache', 'MISS');
  return format === 'geojson' ? res.status(200).json(data) : sendSuccess(res, data);
});

const getAllRoads = asyncHandler(async (req, res) => {
  const format = req.query.format === 'geojson' ? 'geojson' : 'json';
  const cacheKey = `zones:roads:${format}`;
  const cached = spatialCache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return format === 'geojson' ? res.status(200).json(cached) : sendSuccess(res, cached);
  }

  const data = await zoneService.listRoadSegments(format);
  spatialCache.set(cacheKey, data, 60000);
  res.setHeader('X-Cache', 'MISS');
  return format === 'geojson' ? res.status(200).json(data) : sendSuccess(res, data);
});

module.exports = {
  getAllZones,
  getAllZonesCapacity,
  getZoneCapacityById,
  getAllInfrastructure,
  getAllRoads,
};
