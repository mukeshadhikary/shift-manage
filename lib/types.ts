export interface HeaderSnapshot {
  title: string;
  companyName: string;
  managerName: string;
  faxNumber: string;
  transmissionInstructions: string;
  verticalInstructions: string;
  approvalTitle: string;
  approvalPosition: string;
  columnLabels: string[]; // exactly 11 labels
  additionalNotes?: string | null;
}

export interface MarginsSettings {
  left: number; // mm
  right: number; // mm
  bottom: number; // mm
}

export interface AdditionalSettings {
  showDecor: boolean;
  faxMonochrome?: boolean;
}

export interface DesignSnapshot {
  headerColor: string;
  tableHeaderColor: string;
  rowColorOdd: string;
  rowColorEven: string;
  fontScale: number; // %
  rowHeightMm: number; // mm
  columnWidths: number[]; // % array of 11 items
  margins: MarginsSettings;
  additionalSettings: AdditionalSettings;
}

export interface DailyShift {
  id: number;
  shift_date: string; // YYYY-MM-DD
  header_snapshot: HeaderSnapshot;
  design_snapshot: DesignSnapshot;
  created_at: string;
  updated_at: string;
}

export interface ShiftEmployee {
  id: number;
  shift_id: number;
  display_order: number;
  employee_code: string | null;
  employee_name: string;
  nickname: string | null;
  remarks: string | null;
  planned_start_time: string | null; // HH:mm
  actual_start_time: string | null; // HH:mm
  planned_end_time: string | null; // HH:mm
  break_time: string | null; // H:mm duration
  locker_number: string | null;
  signature: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanySettingsRow {
  id: 1;
  company_name: string;
  document_title: string;
  fax_number: string;
  manager_name: string;
  transmission_instructions: string;
  vertical_instructions: string;
  approval_title: string;
  approval_position: string;
  column_labels: string[];
  additional_notes: string | null;
}

export interface DesignSettingsRow {
  id: 1;
  header_color: string;
  table_header_color: string;
  row_color_odd: string;
  row_color_even: string;
  font_scale: number;
  row_height_mm: number;
  column_widths: number[];
  margins: MarginsSettings;
  additional_settings: AdditionalSettings;
}

export interface ShiftWithEmployees extends DailyShift {
  employees: ShiftEmployee[];
}
