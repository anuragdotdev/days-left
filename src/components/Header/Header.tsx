import { Settings as SettingsIcon } from 'lucide-react';
import type { Settings } from '../../types';
import { countdownText } from '../../services/countdown';

interface HeaderProps {
  settings: Settings;
  today: string;
  onOpenSettings: () => void;
}

export function Header({ settings, today, onOpenSettings }: HeaderProps) {
  const todayDate = new Date(`${today}T00:00:00`);
  const text = countdownText(settings, todayDate);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-6 py-4 lg:px-10">
        <h1 className="text-[17px] font-bold tracking-[0.02em] text-text">DEADLINE.</h1>

        <div className="flex items-center gap-4">
          <p
            aria-live="polite"
            className="text-[11px] uppercase tracking-[0.12em] text-text-2"
            title={text}
          >
            {text}
          </p>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open settings"
            title="Settings"
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
          >
            <SettingsIcon size={15} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
