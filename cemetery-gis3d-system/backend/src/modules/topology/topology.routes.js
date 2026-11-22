const express = require('express');
const topologyController = require('./topology.controller');
const validateRequest = require('../../middlewares/validateRequest');
const {
  topologyCheckParamSchema,
  nearbyGravesQuerySchema,
} = require('./topology.validator');

const router = express.Router();

router.get('/audit', topologyController.auditCemeteryTopology);
router.get('/relations', topologyController.getStoredTopologyRelations);
router.get(
  '/graves/:ma_lo_dat',
  validateRequest({ params: topologyCheckParamSchema, query: nearbyGravesQuerySchema }),
  topologyController.checkGraveTopology
);

module.exports = router;
