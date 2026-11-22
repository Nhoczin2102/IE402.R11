const topologyService = require('./topology.service');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/apiResponse');
const { spatialCache } = require('../../utils/memoryCache');

const checkGraveTopology = asyncHandler(async (req, res) => {
  const report = await topologyService.inspectGraveTopology(
    req.params.ma_lo_dat,
    req.query.radius
  );
  return sendSuccess(res, report);
});

const auditCemeteryTopology = asyncHandler(async (req, res) => {
  const cacheKey = 'topology:audit:all';
  const cached = spatialCache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return sendSuccess(res, cached);
  }

  const audit = await topologyService.runFullTopologyAudit();
  spatialCache.set(cacheKey, audit);
  res.setHeader('X-Cache', 'MISS');
  return sendSuccess(res, audit);
});

const getStoredTopologyRelations = asyncHandler(async (req, res) => {
  const relations = await topologyService.listStoredTopologyRelations(req.query.ma_lo_dat || null);
  return sendSuccess(res, relations);
});

module.exports = {
  checkGraveTopology,
  auditCemeteryTopology,
  getStoredTopologyRelations,
};
