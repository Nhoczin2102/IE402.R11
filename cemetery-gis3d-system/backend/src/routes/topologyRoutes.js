const express = require('express');
const topologyController = require('../controllers/topologyController');
const validateRequest = require('../middlewares/validateRequest');
const {
  topologyCheckParamSchema,
  nearbyGravesQuerySchema,
} = require('../validators/topologyValidator');

const router = express.Router();

router.get('/audit', topologyController.auditCemeteryTopology);
router.get('/relations', topologyController.getStoredTopologyRelations);
router.get(
  '/graves/:ma_lo_dat',
  validateRequest({ params: topologyCheckParamSchema, query: nearbyGravesQuerySchema }),
  topologyController.checkGraveTopology
);

module.exports = router;
