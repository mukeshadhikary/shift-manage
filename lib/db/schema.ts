import { z } from 'zod';

const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const timeSchema = z
  .string()
  .trim()
  .transform((v) => (v && v.length > 0 ? v : null))
  .nullable()
  .optional()
  .refine((v) => !v || timeRegex.test(v), {
    message: '正しい時間形式（例: 09:00, 18:30）で入力してください',
  });

const breakTimeRegex = /^([0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;

export const breakTimeSchema = z
  .string()
  .trim()
  .transform((v) => (v && v.length > 0 ? v : null))
  .nullable()
  .optional()
  .refine((v) => !v || breakTimeRegex.test(v), {
    message: '正しい休憩時間形式（例: 1:00, 0:30）で入力してください',
  });

export const employeeInputSchema = z.object({
  id: z.number().optional(),
  employee_name: z.string().trim().min(1, { message: 'スタッフ氏名は必須です' }),
  employee_code: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  nickname: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  remarks: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  planned_start_time: timeSchema,
  actual_start_time: timeSchema,
  planned_end_time: timeSchema,
  break_time: breakTimeSchema,
  locker_number: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  signature: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type EmployeeInput = z.input<typeof employeeInputSchema>;
export type EmployeeOutput = z.output<typeof employeeInputSchema>;

export const headerSnapshotSchema = z.object({
  title: z.string().trim().min(1),
  companyName: z.string().trim().min(1),
  managerName: z.string().trim().min(1),
  faxNumber: z.string().trim().min(1),
  transmissionInstructions: z.string().trim().min(1),
  verticalInstructions: z.string().trim().min(1),
  approvalTitle: z.string().trim().min(1),
  approvalPosition: z.string().trim().min(1),
  columnLabels: z.array(z.string().trim()).length(11),
  additionalNotes: z.string().nullable().optional().transform((v) => (v && v.length > 0 ? v : null)),
});

export const marginsSchema = z.object({
  left: z.number().min(0).max(50).default(5),
  right: z.number().min(0).max(50).default(5),
  bottom: z.number().min(0).max(50).default(5),
});

export const additionalSettingsSchema = z.object({
  showDecor: z.boolean().default(true).optional(),
  faxMonochrome: z.boolean().default(false).optional(),
});

export const designSnapshotSchema = z.object({
  headerColor: z.string().trim().min(1),
  tableHeaderColor: z.string().trim().min(1),
  rowColorOdd: z.string().trim().min(1),
  rowColorEven: z.string().trim().min(1),
  fontScale: z.number().min(50).max(200),
  rowHeightMm: z.number().min(5).max(30),
  columnWidths: z.array(z.number()).length(11),
  margins: marginsSchema.default({ left: 5, right: 5, bottom: 5 }).optional(),
  additionalSettings: additionalSettingsSchema.default({ showDecor: true, faxMonochrome: false }).optional(),
});

export const createShiftSchema = z.object({
  shift_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で入力してください'),
  header_snapshot: headerSnapshotSchema.optional(),
  design_snapshot: designSnapshotSchema.optional(),
  employees: z.array(employeeInputSchema).default([]),
});

export const companySettingsSchema = z.object({
  company_name: z.string().trim().min(1),
  document_title: z.string().trim().min(1),
  fax_number: z.string().trim().min(1),
  manager_name: z.string().trim().min(1),
  transmission_instructions: z.string().trim().min(1),
  vertical_instructions: z.string().trim().min(1),
  approval_title: z.string().trim().min(1),
  approval_position: z.string().trim().min(1),
  column_labels: z.array(z.string().trim()).length(11),
  additional_notes: z.string().nullable().optional().transform((v) => (v && v.length > 0 ? v : null)),
});

export const designSettingsSchema = z.object({
  header_color: z.string().trim().min(1),
  table_header_color: z.string().trim().min(1),
  row_color_odd: z.string().trim().min(1),
  row_color_even: z.string().trim().min(1),
  font_scale: z.number().min(50).max(200),
  row_height_mm: z.number().min(5).max(30),
  column_widths: z.array(z.number()).length(11),
  margins: marginsSchema,
  additional_settings: additionalSettingsSchema,
});
