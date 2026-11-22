// backend/src/routes/api.js
const express = require('express');
const router = express.Router();
const cemeteryCtrl = require('../controllers/cemeteryController');
const routingCtrl = require('../controllers/routingController');
router.put('/graves/:ma_lo_dat', cemeteryCtrl.updateGrave);

router.get('/graves', cemeteryCtrl.getAllGraves);
router.post('/graves/allocate', cemeteryCtrl.allocateGrave);
router.get('/routing/shortest-path', routingCtrl.findShortestRoute3D);

module.exports = router;