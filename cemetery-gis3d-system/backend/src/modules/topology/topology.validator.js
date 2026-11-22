const { z } = require('zod');

const topologyCheckParamSchema = z.object({
  ma_lo_dat: z.string().trim().min(1, 'Mã lô đất không được để trống').max(30),
});

const nearbyGravesQuerySchema = z.object({
  radius: z.coerce
    .number({ invalid_type_error: 'radius phải là số dương (đơn vị mét)' })
    .positive('radius phải lớn hơn 0')
    .max(500, 'radius tối đa là 500m')
    .optional()
    .default(10),
});

module.exports = {
  topologyCheckParamSchema,
  nearbyGravesQuerySchema,
};
