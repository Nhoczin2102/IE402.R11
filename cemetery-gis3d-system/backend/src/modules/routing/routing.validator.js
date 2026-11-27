const { z } = require('zod');
const { DEFAULT_NETWORK_NODES } = require('../../constants/cemeteryConstants');

const validStartNodes = Object.keys(DEFAULT_NETWORK_NODES);

const shortestPathQuerySchema = z.object({
  targetX: z.coerce.number({ error: 'targetX phải là số thực hợp lệ' }),
  targetZ: z.coerce.number({ error: 'targetZ phải là số thực hợp lệ' }),
  startNode: z
    .string()
    .trim()
    .refine((val) => validStartNodes.includes(val), {
      message: `startNode không hợp lệ. Các nút hỗ trợ: ${validStartNodes.join(', ')}`,
    })
    .optional()
    .default('GATE'),
});

module.exports = {
  shortestPathQuerySchema,
};
