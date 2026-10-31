import React, { useState, useEffect } from 'react';
import type { EmployeeInput } from '@/lib/db/schema';
import { ja } from '@/lib/i18n/ja';
import { formatTimeHM } from '@/lib/date';
import { ArrowUp, ArrowDown, Trash2, Sparkles } from 'lucide-react';
import { fetchStaffSuggestionsAction, searchStaffSuggestionsAction } from '@/app/actions';

interface StaffSuggestion {
  employee_name: string;
  employee_code: string | null;
  nickname: string | null;
  planned_start_time: string | null;
  planned_end_time: string | null;
  break_time: string | null;
  locker_number: string | null;
}

interface EmployeeFormProps {
  initialData?: Partial<EmployeeInput>;
  onSave: (data: EmployeeInput) => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onCancel: () => void;
  isWizardStep?: boolean;
  existingCodes?: string[];
  currentEmployeeId?: number;
}

const COMMON_START_TIMES = ['08:30', '09:00', '10:00', '13:00', '22:00'];
const COMMON_END_TIMES = ['17:30', '18:00', '19:00', '22:00', '06:00'];
const BREAK_TIME_CHIPS = [ja.common.none, '0:30', '1:00', '1:30', '2:00'];

export function EmployeeForm({
  initialData,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  onCancel,
  isWizardStep = false,
  existingCodes = [],
}: EmployeeFormProps) {
  const [name, setName] = useState(initialData?.employee_name || '');
  const [code, setCode] = useState(initialData?.employee_code || '');
  const [nickname, setNickname] = useState(initialData?.nickname || '');
  const [remarks, setRemarks] = useState(initialData?.remarks || '');
  const [plannedStartTime, setPlannedStartTime] = useState(initialData?.planned_start_time || '09:00');
  const [actualStartTime, setActualStartTime] = useState(initialData?.actual_start_time || '');
  const [plannedEndTime, setPlannedEndTime] = useState(initialData?.planned_end_time || '18:00');
  const [breakTime, setBreakTime] = useState(initialData?.break_time || '1:00');
  const [lockerNumber, setLockerNumber] = useState(initialData?.locker_number || ja.common.none);
  const [signature, setSignature] = useState(initialData?.signature || '');

  const [nameError, setNameError] = useState('');
  const [suggestions, setSuggestions] = useState<StaffSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Initial fetch on mount
  useEffect(() => {
    fetchStaffSuggestionsAction()
      .then((data) => {
        if (data && Array.isArray(data)) {
          setSuggestions(data);
        }
      })
      .catch(() => {});
  }, []);

  // Real-time database scan when typing staff name
  useEffect(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      fetchStaffSuggestionsAction()
        .then((data) => {
          if (data && Array.isArray(data)) setSuggestions(data);
        })
        .catch(() => {});
      return;
    }

    const timer = setTimeout(() => {
      searchStaffSuggestionsAction(trimmed)
        .then((results) => {
          if (results && Array.isArray(results)) {
            setSuggestions(results);
          }
        })
        .catch(() => {});
    }, 120);

    return () => clearTimeout(timer);
  }, [name]);

  const handleSelectSuggestion = (s: StaffSuggestion) => {
    setName(s.employee_name);
    if (s.employee_code) setCode(s.employee_code);
    if (s.nickname) setNickname(s.nickname);
    if (s.planned_start_time) setPlannedStartTime(s.planned_start_time);
    if (s.planned_end_time) setPlannedEndTime(s.planned_end_time);
    if (s.break_time) setBreakTime(s.break_time);
    if (s.locker_number) setLockerNumber(s.locker_number);
    setShowSuggestions(false);
  };

  // Check code duplicate warning (not blocking)
  const isCodeDuplicate = code.trim() && existingCodes.includes(code.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError(ja.employee.nameRequired);
      return;
    }
    setNameError('');

    onSave({
      id: initialData?.id,
      employee_name: name.trim(),
      employee_code: code.trim() || null,
      nickname: nickname.trim() || null,
      remarks: remarks.trim() || null,
      planned_start_time: plannedStartTime ? formatTimeHM(plannedStartTime) : null,
      actual_start_time: actualStartTime ? formatTimeHM(actualStartTime) : null,
      planned_end_time: plannedEndTime ? formatTimeHM(plannedEndTime) : null,
      break_time: (breakTime === 'なし' || breakTime === ja.common.none) ? null : breakTime ? formatTimeHM(breakTime) : null,
      locker_number: lockerNumber.trim() || null,
      signature: signature.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
      {/* Reorder & Delete Toolbar (when editing existing employee) */}
      {!isWizardStep && initialData?.id && (
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-1.5">
            {onMoveUp && (
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                className="px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 min-h-[44px]"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>{ja.common.moveUp}</span>
              </button>
            )}
            {onMoveDown && (
              <button
                type="button"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                className="px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 min-h-[44px]"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>{ja.common.moveDown}</span>
              </button>
            )}
          </div>

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 flex items-center gap-1 min-h-[44px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{ja.common.delete}</span>
            </button>
          )}
        </div>
      )}

      {/* スタッフ氏名 (Required) */}
      <div className="relative">
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          {ja.employee.name} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onFocus={() => setShowSuggestions(true)}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value.trim()) setNameError('');
            setShowSuggestions(true);
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={ja.employee.namePlaceholder}
          className={`w-full px-3.5 py-2.5 rounded-xl border ${
            nameError ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 focus:border-[#0F2A66]'
          } bg-white text-gray-900 text-base focus:outline-none transition-colors`}
        />
        {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}

        {/* Past Staff Autocomplete Dropdown */}
        {showSuggestions && name.trim() && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden divide-y divide-gray-100 max-h-56 overflow-y-auto">
            <div className="px-3 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-500 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#0F2A66]" />
                <span>{ja.employee.autocompleteLabel}</span>
              </div>
              <span className="text-[9px] text-gray-400">タップで自動入力</span>
            </div>
            {suggestions.slice(0, 8).map((m, idx) => (
              <button
                key={idx}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectSuggestion(m);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-blue-50 active:bg-blue-100 transition-colors flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-900">{m.employee_name}</span>
                  {m.nickname && <span className="text-[11px] text-gray-500">（{m.nickname}）</span>}
                </div>
                <span className="text-gray-400 font-mono text-[11px]">
                  {m.employee_code ? `[${m.employee_code}] ` : ''}
                  {m.planned_start_time || ''}〜{m.planned_end_time || ''}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CODE & ニックネーム (2 columns) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            {ja.employee.code}
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={ja.employee.codePlaceholder}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#0F2A66] bg-white text-gray-900 text-base focus:outline-none transition-colors"
          />
          {isCodeDuplicate && (
            <p className="mt-1 text-[11px] text-amber-600 font-medium">
              {ja.wizard.codeDuplicateWarning}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            {ja.employee.nickname}
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={ja.employee.nicknamePlaceholder}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#0F2A66] bg-white text-gray-900 text-base focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* 始業予定時間 & 始業実時間 */}
      <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {ja.employee.plannedStartTime}
            </label>
            <input
              type="time"
              step="300"
              value={plannedStartTime}
              onChange={(e) => setPlannedStartTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 text-base focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {ja.employee.actualStartTime}
            </label>
            <input
              type="time"
              step="300"
              value={actualStartTime}
              onChange={(e) => setActualStartTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 text-base focus:outline-none"
            />
          </div>
        </div>

        {/* Quick Chips for Start Time */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-gray-400 font-medium mr-1">{ja.employee.quickStartTime}</span>
          {COMMON_START_TIMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setPlannedStartTime(t)}
              className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                plannedStartTime === t
                  ? 'bg-[#0F2A66] text-white border-[#0F2A66]'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 終了予定時間 & 休憩時間 */}
      <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {ja.employee.plannedEndTime}
            </label>
            <input
              type="time"
              step="300"
              value={plannedEndTime}
              onChange={(e) => setPlannedEndTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 text-base focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {ja.employee.breakTime}
            </label>
            <input
              type="text"
              value={breakTime}
              onChange={(e) => setBreakTime(e.target.value)}
              placeholder="1:00"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 text-base focus:outline-none"
            />
          </div>
        </div>

        {/* Quick Chips for End Time */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-gray-400 font-medium mr-1">{ja.employee.quickEndTime}</span>
          {COMMON_END_TIMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setPlannedEndTime(t)}
              className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                plannedEndTime === t
                  ? 'bg-[#0F2A66] text-white border-[#0F2A66]'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Quick Chips for Break Time */}
        <div className="flex flex-wrap gap-1.5 items-center mt-1">
          <span className="text-[10px] text-gray-400 font-medium mr-1">{ja.employee.quickBreakTime}</span>
          {BREAK_TIME_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setBreakTime(chip)}
              className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                breakTime === chip
                  ? 'bg-[#0F2A66] text-white border-[#0F2A66]'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* ロッカー番号 & 備考 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            {ja.employee.lockerNumber}
          </label>
          <input
            type="text"
            value={lockerNumber}
            onChange={(e) => setLockerNumber(e.target.value)}
            placeholder={ja.employee.lockerPlaceholder}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#0F2A66] bg-white text-gray-900 text-base focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            {ja.employee.remarks}
          </label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder={ja.employee.remarksPlaceholder}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#0F2A66] bg-white text-gray-900 text-base focus:outline-none"
          />
        </div>
      </div>

      {/* 本人自署 (Optional / manual sign default) */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          {ja.employee.signature} <span className="text-gray-400 font-normal">{ja.employee.signatureHint}</span>
        </label>
        <input
          type="text"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder={ja.employee.signaturePlaceholder}
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#0F2A66] bg-white text-gray-900 text-base focus:outline-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors min-h-[44px]"
        >
          {ja.common.cancel}
        </button>
        <button
          type="submit"
          className="flex-1 py-3 px-4 rounded-xl bg-[#0F2A66] text-white text-sm font-semibold hover:bg-[#0c2252] active:bg-[#0a1a40] transition-colors shadow-md min-h-[44px]"
        >
          {isWizardStep ? ja.common.next : ja.common.save}
        </button>
      </div>
    </form>
  );
}
