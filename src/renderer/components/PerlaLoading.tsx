import mark from '../assets/perla-loading-mark.svg';

/** Initial queries use a reserved surface; background refreshes keep their data. */
export function PerlaLoading({
  label = 'Preparando tu espacio…',
  size = 'panel',
}: {
  label?: string;
  size?: 'screen' | 'panel' | 'compact' | 'inline';
}) {
  return (
    <div
      className={`perla-loading perla-loading--${size}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={label}
    >
      <div className="perla-loading__emblem" aria-hidden="true">
        <img className="perla-loading__mark" src={mark} alt="" width={172} height={164} />
      </div>
      <span className="perla-loading__label">{label}</span>
      <span className="perla-loading__track" aria-hidden="true" />
    </div>
  );
}
