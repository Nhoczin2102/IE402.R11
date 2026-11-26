const { z } = require('zod');
const {
  GRAVE_STATUS,
  DB_GRAVE_STATUS,
  VALID_GRAVE_STATUSES,
} = require('../../constants/cemeteryConstants');

const bboxSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      const parts = value.split(',').map(Number);
      return (
        parts.length === 4 &&
        parts.every((n) => Number.isFinite(n)) &&
        parts[0] < parts[2] &&
        parts[1] < parts[3]
      );
    },
    { message: 'bbox phải theo định dạng "minX,minZ,maxX,maxZ" với minX < maxX và minZ < maxZ' }
  );

const listGravesQuerySchema = z.object({
  ma_phan_khu: z.string().trim().min(1).max(30).optional(),
  trang_thai: z.enum(VALID_GRAVE_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
  format: z.enum(['json', 'geojson']).optional(),
  bbox: bboxSchema.optional(),
  lod: z.coerce.number().int().min(1).max(3).optional(),
});

const graveParamSchema = z.object({
  ma_lo_dat: z.string().trim().min(1, 'Mã lô đất không được để trống').max(30),
});

const createGraveBodySchema = z.object({
  ma_lo_dat: z
    .string()
    .trim()
    .min(2, 'Mã lô đất tối thiểu 2 ký tự')
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/, 'Mã lô đất chỉ được chứa chữ, số, dấu gạch ngang hoặc gạch dưới'),
  ma_phan_khu: z.string().trim().min(1, 'Thiếu mã phân khu').max(30),
  ma_mau_mo: z.string().trim().min(1, 'Thiếu mã mẫu mộ 3D').max(20),
  vi_tri_hang_o: z.string().trim().min(1, 'Thiếu vị trí hàng/ô').max(50),
  toa_do_x: z.coerce.number({ error: 'toa_do_x phải là số thực hợp lệ' }),
  toa_do_z: z.coerce.number({ error: 'toa_do_z phải là số thực hợp lệ' }),
  cao_do_z: z.coerce.number().optional(),
  goc_xoay_z: z.coerce.number().min(0).max(360).optional().default(0),
});

const allocateGraveBodySchema = z.object({
  ma_lo_dat: z.string().trim().min(1, 'Thiếu mã lô đất').max(30),
  trang_thai: z.enum(
    [
      GRAVE_STATUS.OCCUPIED,
      GRAVE_STATUS.RESERVED,
      DB_GRAVE_STATUS.OCCUPIED,
      DB_GRAVE_STATUS.RESERVED,
    ],
    {
      error: `Trạng thái cấp phát phải là "${GRAVE_STATUS.OCCUPIED}" hoặc "${GRAVE_STATUS.RESERVED}"`,
    }
  ),
  ho_ten: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(100),
  ngay_sinh: z.string().trim().max(20).optional().nullable(),
  ngay_mat: z.string().trim().max(20).optional().nullable(),
  ngay_an_tang: z.string().trim().max(20).optional().nullable(),
  thong_tin_than_nhan: z.string().trim().max(150).optional().nullable(),
});

const updateGraveBodySchema = z
  .object({
    trang_thai: z.enum(VALID_GRAVE_STATUSES, {
      error: `Trạng thái phải thuộc: ${GRAVE_STATUS.EMPTY}, ${GRAVE_STATUS.OCCUPIED}, ${GRAVE_STATUS.RESERVED}`,
    }),
    ho_ten: z.string().trim().max(100).optional().nullable(),
    ngay_sinh: z.string().trim().max(20).optional().nullable(),
    ngay_mat: z.string().trim().max(20).optional().nullable(),
    ngay_an_tang: z.string().trim().max(20).optional().nullable(),
    thong_tin_than_nhan: z.string().trim().max(150).optional().nullable(),
  })
  .refine(
    (data) => {
      const isReclaim =
        data.trang_thai === GRAVE_STATUS.EMPTY || data.trang_thai === DB_GRAVE_STATUS.EMPTY;
      if (isReclaim) return true;
      return Boolean(data.ho_ten && data.ho_ten.trim().length >= 2);
    },
    {
      message: 'Cần cung cấp họ tên (tối thiểu 2 ký tự) khi trạng thái lô mộ không phải "Trống".',
      path: ['ho_ten'],
    }
  );

module.exports = {
  listGravesQuerySchema,
  graveParamSchema,
  createGraveBodySchema,
  allocateGraveBodySchema,
  updateGraveBodySchema,
};
