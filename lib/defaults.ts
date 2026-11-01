import { HeaderSnapshot, DesignSnapshot, CompanySettingsRow, DesignSettingsRow } from './types';

export const DEFAULT_COLUMN_LABELS: string[] = [
  'NO',
  'CODE',
  'スタッフ氏名',
  'ニックネーム',
  '備考',
  '始業予定時間',
  '始業実時間',
  '終了予定時間',
  '休憩時間',
  'ロッカー番号',
  '本人自署',
];

export const DEFAULT_COLUMN_WIDTHS: number[] = [
  4.1,  // NO
  8.9,  // CODE
  18.0, // スタッフ氏名
  11.2, // ニックネーム
  8.6,  // 備考
  8.2,  // 始業予定時間
  8.2,  // 始業実時間
  8.2,  // 終了予定時間
  8.2,  // 休憩時間
  7.6,  // ロッカー番号
  8.8,  // 本人自署
];

export const DEFAULT_HEADER_SNAPSHOT: HeaderSnapshot = {
  title: 'ワールドワークス',
  companyName: 'ワールドワークスCMC',
  managerName: '島津 様',
  faxNumber: '049-293-7855',
  transmissionInstructions: '❶派遣会社様 → ❷丸和運輸機関 → ❸派遣会社様',
  verticalInstructions: 'スタッフ様自署サイン→弊社社員サイン→各派遣会社様へFAX(翌日AM9:00までに送付)',
  approvalTitle: '丸和運輸機関',
  approvalPosition: 'センター長',
  columnLabels: [...DEFAULT_COLUMN_LABELS],
  additionalNotes: null,
};

export const DEFAULT_DESIGN_SNAPSHOT: DesignSnapshot = {
  headerColor: '#0F2A66',
  tableHeaderColor: '#0F2A66',
  rowColorOdd: '#FFFFFF',
  rowColorEven: '#EDF5FF',
  fontScale: 100,
  rowHeightMm: 11.5,
  columnWidths: [...DEFAULT_COLUMN_WIDTHS],
  margins: {
    left: 10.5,
    right: 10.5,
    bottom: 10.0,
  },
  additionalSettings: {
    showDecor: true,
  },
};

export const DEFAULT_COMPANY_SETTINGS: CompanySettingsRow = {
  id: 1,
  company_name: DEFAULT_HEADER_SNAPSHOT.companyName,
  document_title: DEFAULT_HEADER_SNAPSHOT.title,
  fax_number: DEFAULT_HEADER_SNAPSHOT.faxNumber,
  manager_name: DEFAULT_HEADER_SNAPSHOT.managerName,
  transmission_instructions: DEFAULT_HEADER_SNAPSHOT.transmissionInstructions,
  vertical_instructions: DEFAULT_HEADER_SNAPSHOT.verticalInstructions,
  approval_title: DEFAULT_HEADER_SNAPSHOT.approvalTitle,
  approval_position: DEFAULT_HEADER_SNAPSHOT.approvalPosition,
  column_labels: [...DEFAULT_HEADER_SNAPSHOT.columnLabels],
  additional_notes: null,
};

export const DEFAULT_DESIGN_SETTINGS: DesignSettingsRow = {
  id: 1,
  header_color: DEFAULT_DESIGN_SNAPSHOT.headerColor,
  table_header_color: DEFAULT_DESIGN_SNAPSHOT.tableHeaderColor,
  row_color_odd: DEFAULT_DESIGN_SNAPSHOT.rowColorOdd,
  row_color_even: DEFAULT_DESIGN_SNAPSHOT.rowColorEven,
  font_scale: DEFAULT_DESIGN_SNAPSHOT.fontScale,
  row_height_mm: DEFAULT_DESIGN_SNAPSHOT.rowHeightMm,
  column_widths: [...DEFAULT_DESIGN_SNAPSHOT.columnWidths],
  margins: { ...DEFAULT_DESIGN_SNAPSHOT.margins },
  additional_settings: { ...DEFAULT_DESIGN_SNAPSHOT.additionalSettings },
};
