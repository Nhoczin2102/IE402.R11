const express = require('express');
const routingController = require('./routing.controller');
const validateRequest = require('../../middlewares/validateRequest');
const { shortestPathQuerySchema } = require('./routing.validator');

const router = express.Router();

router.get(
  '/shortest-path',
  validateRequest({ query: shortestPathQuerySchema }),
  routingController.findShortestRoute3D
);
router.get('/network', routingController.getRoadNetwork);

module.exports = router;
