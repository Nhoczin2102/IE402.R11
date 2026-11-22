const { z } = require('zod');
const { GRAVE_STATUS, VALID_GRAVE_STATUSES } = require('../constants/cemeteryConstants');

const listGravesQuerySchema = z.object({
  ma_phan_khu: z.string().trim().min(1).max(20).optional(),
  trang_thai: z.enum(VALID_GRAVE_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
  format: z.enum(['json', 'geojson']).optional(),
});

const graveParamSchema = z.object({
  ma_lo_dat: z.string().trim().min(1, 'Mã lô đất không được để trống').max(30),
});

const allocateGraveBodySchema = z.object({
  ma_lo_dat: z.string().trim().min(1, 'Thiếu mã lô đất').max(30),
  trang_thai: z.enum([GRAVE_STATUS.OCCUPIED, GRAVE_STATUS.RESERVED], {
    errorMap: () => ({
      message: `Trạng thái cấp phát phải là "${GRAVE_STATUS.OCCUPIED}" hoặc "${GRAVE_STATUS.RESERVED}"`,
    }),
  }),
  ho_ten: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(100),
  ngay_sinh: z.string().trim().max(20).optional().nullable(),
  ngay_mat: z.string().trim().max(20).optional().nullable(),
  ngay_an_tang: z.string().trim().max(20).optional().nullable(),
  thong_tin_than_nhan: z.string().trim().max(150).optional().nullable(),
});

const updateGraveBodySchema = z
  .object({
    trang_thai: z.enum(VALID_GRAVE_STATUSES, {
      errorMap: () => ({
        message: `Trạng thái phải thuộc: ${VALID_GRAVE_STATUSES.join(', ')}`,
      }),
    }),
    ho_ten: z.string().trim().min(2).max(100).optional().nullable(),
    ngay_sinh: z.string().trim().max(20).optional().nullable(),
    ngay_mat: z.string().trim().max(20).optional().nullable(),
    ngay_an_tang: z.string().trim().max(20).optional().nullable(),
    thong_tin_than_nhan: z.string().trim().max(150).optional().nullable(),
  })
  .refine(
    (data) => data.trang_thai === GRAVE_STATUS.EMPTY || Boolean(data.ho_ten && data.ho_ten.trim()),
    {
      message: 'Cần cung cấp họ tên khi trạng thái lô mộ không phải "Trống".',
      path: ['ho_ten'],
    }
  );

module.exports = {
  listGravesQuerySchema,
  graveParamSchema,
  allocateGraveBodySchema,
  updateGraveBodySchema,
};
