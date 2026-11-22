const express = require('express');
const zoneController = require('./zone.controller');

const router = express.Router();

router.get('/', zoneController.getAllZones);
router.get('/capacity', zoneController.getAllZonesCapacity);
router.get('/infrastructure', zoneController.getAllInfrastructure);
router.get('/roads', zoneController.getAllRoads);
router.get('/:ma_phan_khu/capacity', zoneController.getZoneCapacityById);

module.exports = router;
