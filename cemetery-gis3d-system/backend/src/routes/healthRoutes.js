const express = require('express');
const healthController = require('../controllers/healthController');

const router = express.Router();

router.get('/', healthController.getLiveness);
router.get('/ready', healthController.getReadiness);

module.exports = router;
