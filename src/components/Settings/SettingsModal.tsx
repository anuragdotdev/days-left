import { useEffect, useRef, useState } from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';
import type { AppData, Settings, Theme, WeekStart } from '../../types';
import { Modal } from '../ui/Modal';
import { Field, inputClass } from '../ui/Field';
import { exportData, importDataFromFile } from '../../utils/transfer';

interface SettingsModalProps {
  open: boolean;
  settings: Settings;
  data: AppData;
  onClose: () => void;
  onSave: (patch: Partial<Settings>) => void;
  onImport: (data: AppData) => void;
  onReset: () => void;
}

export function SettingsModal({
  open,
  settings,
  data,
  onClose,
  onSave,
  onImport,
  onReset,
}: SettingsModalProps) {
  const [label, setLabel] = useState(settings.countdownLabel);
  const [target, setTarget] = useState(settings.countdownTarget);
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStart>(settings.weekStartsOn);
  const [theme, setTheme] = useState<Theme>(settings.theme);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setLabel(settings.countdownLabel);
    setTarget(settings.countdownTarget);
    setWeekStartsOn(settings.weekStartsOn);
    setTheme(settings.theme);
    setConfirmReset(false);
    setMessage(null);
  }, [open, settings]);

  const save = () => {
    onSave({
      countdownLabel: label.trim() || 'year end',
      countdownTarget: target,
      weekStartsOn,
      theme,
    });
    onClose();
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    const result = await importDataFromFile(file);
    if (!result.ok) {
      setMessage(result.error ?? 'Import failed');
      return;
    }
    onImport(result.data);
    setMessage('Data imported');
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Settings"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-3 py-1.5 text-[12px] text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-bg transition-opacity hover:opacity-90"
          >
            Save
          </button>
        </>
      }
    >
      <Field label="Countdown label" htmlFor="settings-label">
        <input
          id="settings-label"
          className={inputClass}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="year end"
          autoComplete="off"
        />
      </Field>

      <Field label="Countdown target date" htmlFor="settings-target">
        <input
          id="settings-target"
          type="date"
          className={inputClass}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
      </Field>

      <Field label="Week starts on" htmlFor="settings-week-start">
        <div id="settings-week-start" role="radiogroup" className="flex gap-1">
          {(['monday', 'sunday'] as WeekStart[]).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={weekStartsOn === option}
              onClick={() => setWeekStartsOn(option)}
              className={[
                'flex-1 rounded-lg border px-3 py-2 text-[12px] transition-colors',
                weekStartsOn === option
                  ? 'border-text-2 bg-surface-2 text-text'
                  : 'border-line text-text-3 hover:text-text-2',
              ].join(' ')}
            >
              {option === 'monday' ? 'Monday' : 'Sunday'}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Theme" htmlFor="settings-theme">
        <div id="settings-theme" role="radiogroup" className="flex gap-1">
          {(['dark', 'light'] as Theme[]).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={theme === option}
              onClick={() => setTheme(option)}
              className={[
                'flex-1 rounded-lg border px-3 py-2 text-[12px] capitalize transition-colors',
                theme === option
                  ? 'border-text-2 bg-surface-2 text-text'
                  : 'border-line text-text-3 hover:text-text-2',
              ].join(' ')}
            >
              {option}
            </button>
          ))}
        </div>
      </Field>

      <div className="mt-1 border-t border-line-soft pt-3">
        <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-text-3">Data</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportData(data)}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
          >
            <Download size={12} strokeWidth={1.5} aria-hidden="true" />
            Export JSON
          </button>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
          >
            <Upload size={12} strokeWidth={1.5} aria-hidden="true" />
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Import data from JSON file"
            onChange={(event) => {
              void handleImport(event.target.files?.[0]);
              event.target.value = '';
            }}
          />

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-1.5 rounded-lg border border-danger/50 px-3 py-1.5 text-[12px] text-danger transition-colors hover:bg-danger/10"
            >
              <Trash2 size={12} strokeWidth={1.5} aria-hidden="true" />
              Reset all data
            </button>
          ) : (
            <span className="flex items-center gap-2">
              <span className="text-[11px] text-text-2">Delete everything?</span>
              <button
                type="button"
                onClick={() => {
                  onReset();
                  setConfirmReset(false);
                  onClose();
                }}
                className="rounded-lg bg-danger px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-lg border border-line px-3 py-1.5 text-[12px] text-text-2 transition-colors hover:text-text"
              >
                Cancel
              </button>
            </span>
          )}
        </div>
        {message ? <p className="mt-2 text-[11px] text-text-3">{message}</p> : null}
      </div>
    </Modal>
  );
}
