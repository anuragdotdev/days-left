interface FieldProps {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}

export function Field({ label, htmlFor, children, hint }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[10px] uppercase tracking-[0.12em] text-text-3">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[11px] text-text-3">{hint}</p> : null}
    </div>
  );
}

export const inputClass =
  'w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px] text-text outline-none transition-colors placeholder:text-text-3 focus:border-text-3';

export const selectClass = `${inputClass} appearance-none`;
