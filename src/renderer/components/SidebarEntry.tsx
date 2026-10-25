import { useId, useState, type ComponentProps } from 'react';
import { Icon } from './Icon';
import './sidebar-entry.css';

export function SidebarEntry({
  entry,
  active,
  activeArea,
  compact,
  onNavigate,
}: {
  entry: {
    title: string;
    icon: ComponentProps<typeof Icon>['name'];
    areas: readonly (readonly [string, string])[];
  };
  active: boolean;
  activeArea?: string | undefined;
  compact: boolean;
  onNavigate: (target: string, label: string) => void | Promise<void>;
}) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const hasAreas = entry.areas.length > 1;
  return (
    <div className={`sidebar-module${active ? ' sidebar-module-active' : ''}`}>
      <div className="sidebar-module-heading">
        <button
          type="button"
          className={`nav-item${active ? ' selected' : ''}`}
          aria-current={active && (!hasAreas || !expanded) ? 'page' : undefined}
          aria-label={entry.title}
          title={compact ? entry.title : undefined}
          onClick={() => {
            if (hasAreas) setExpanded(true);
            if (!active || !hasAreas) {
              const [target, label] = entry.areas[0]!;
              void onNavigate(target, label);
            }
          }}
        >
          <span className="nav-icon" aria-hidden="true">
            <Icon name={entry.icon} />
          </span>
          <span className="nav-label">{entry.title}</span>
        </button>
        {hasAreas && !compact && (
          <button
            type="button"
            className="sidebar-module-toggle"
            aria-label={`${expanded ? 'Ocultar' : 'Mostrar'} opciones de ${entry.title}`}
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => setExpanded((value) => !value)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="nav-group-chevron"
              data-expanded={expanded}
            >
              <path
                d="m6 4 4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
      {hasAreas && expanded && !compact && (
        <div
          id={id}
          role="group"
          aria-label={`Opciones de ${entry.title}`}
          className="sidebar-submenu"
        >
          {entry.areas.map(([target, label]) => (
            <button
              key={label}
              type="button"
              className={`sidebar-subitem${active && activeArea === label ? ' selected' : ''}`}
              aria-label={`${entry.title}: ${label}`}
              aria-current={active && activeArea === label ? 'page' : undefined}
              onClick={() => void onNavigate(target, label)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
