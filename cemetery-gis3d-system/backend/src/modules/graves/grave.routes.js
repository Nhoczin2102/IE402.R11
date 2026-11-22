const express = require('express');
const graveController = require('./grave.controller');
const validateRequest = require('../../middlewares/validateRequest');
const {
  listGravesQuerySchema,
  graveParamSchema,
  allocateGraveBodySchema,
  updateGraveBodySchema,
} = require('./grave.validator');

const router = express.Router();

router.get('/', validateRequest({ query: listGravesQuerySchema }), graveController.getAllGraves);
router.get('/export/csv', validateRequest({ query: listGravesQuerySchema }), graveController.exportGravesCsv);
router.post('/allocate', validateRequest({ body: allocateGraveBodySchema }), graveController.allocateGrave);
router.get('/:ma_lo_dat', validateRequest({ params: graveParamSchema }), graveController.getGraveById);
router.put(
  '/:ma_lo_dat',
  validateRequest({ params: graveParamSchema, body: updateGraveBodySchema }),
  graveController.updateGrave
);

module.exports = router;
