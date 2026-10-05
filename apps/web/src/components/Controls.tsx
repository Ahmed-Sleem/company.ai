/**
 * The small controls the demo's toolbars are made of: a search field, a select, and a
 * two-position segmented switch. They exist once and are used by every view's toolbar.
 */
import { useId } from 'react';

export function SearchField({
  value, onChange, placeholder, label,
}: { value: string; onChange: (next: string) => void; placeholder: string; label: string }) {
  const id = useId();
  return (
    <div className="field">
      <label className="visually-hidden" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="search"
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function Select<T extends string>({
  value, onChange, options, label,
}: {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string }>;
  label: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label className="visually-hidden" htmlFor={id}>{label}</label>
      <select id={id} className="select" value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

export function Segmented<T extends string>({
  value, onChange, options, label,
}: {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string }>;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          data-value={option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
