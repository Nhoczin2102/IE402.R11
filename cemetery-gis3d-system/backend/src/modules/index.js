const express = require('express');
const graveRoutes = require('./graves/grave.routes');
const zoneRoutes = require('./zones/zone.routes');
const topologyRoutes = require('./topology/topology.routes');
const routingRoutes = require('./routing/routing.routes');

const router = express.Router();

router.use('/graves', graveRoutes);
router.use('/zones', zoneRoutes);
router.use('/topology', topologyRoutes);
router.use('/routing', routingRoutes);

module.exports = router;
