import type { AppData } from '../types';
import { migrate } from '../services/migrate';

/** Download the full application state as a JSON file. */
export function exportData(data: AppData): void {
  const payload = JSON.stringify(data, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.download = `deadline-backup-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export type ImportResult = { ok: true; data: AppData } | { ok: false; error: string };

/** Read and validate a JSON backup file. */
export async function importDataFromFile(file: File): Promise<ImportResult> {
  try {
    const text = await file.text();
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'File does not contain a valid DEADLINE. backup' };
    }
    const raw = parsed as Record<string, unknown>;
    if (!Array.isArray(raw.events) && !Array.isArray(raw.tasks) && !raw.settings) {
      return { ok: false, error: 'File does not contain a valid DEADLINE. backup' };
    }
    return { ok: true, data: migrate(parsed) };
  } catch {
    return { ok: false, error: 'Could not read the selected file' };
  }
}
