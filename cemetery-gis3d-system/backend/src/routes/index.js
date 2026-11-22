const express = require('express');
const graveRoutes = require('./graveRoutes');
const zoneRoutes = require('./zoneRoutes');
const topologyRoutes = require('./topologyRoutes');
const routingRoutes = require('./routingRoutes');

const router = express.Router();

router.use('/graves', graveRoutes);
router.use('/zones', zoneRoutes);
router.use('/topology', topologyRoutes);
router.use('/routing', routingRoutes);

module.exports = router;
