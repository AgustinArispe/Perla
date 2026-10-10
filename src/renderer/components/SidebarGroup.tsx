import { useEffect, useId, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

const sectionIcons = {
  'Trabajo diario': 'cash',
  Mercadería: 'box',
  Negocio: 'chart',
  Administración: 'settings',
} as const;

export function SidebarGroup({
  title,
  userId,
  activeTitle,
  compact,
  onCompactOpen,
  children,
}: {
  title: string;
  userId: string;
  activeTitle?: string | undefined;
  compact: boolean;
  onCompactOpen: () => void;
  children: ReactNode;
}) {
  const id = useId();
  const key = `perla:sidebar:${userId}:${title}`;
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem(key) !== 'false';
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, String(expanded));
    } catch {
      /* Navigation remains usable without browser storage. */
    }
  }, [expanded, key]);
  return (
    <div className={`nav-group${activeTitle ? ' nav-group-active' : ''}`}>
      <button
        type="button"
        className="nav-group-toggle"
        aria-label={`${compact ? 'Abrir' : expanded ? 'Colapsar' : 'Desplegar'} sección ${title}`}
        title={compact ? title : undefined}
        aria-expanded={!compact && expanded}
        aria-controls={id}
        onClick={() => {
          if (compact) {
            setExpanded(true);
            onCompactOpen();
          } else setExpanded((value) => !value);
        }}
      >
        <span className="nav-group-icon" aria-hidden="true">
          <Icon name={sectionIcons[title as keyof typeof sectionIcons] ?? 'box'} size={20} />
        </span>
        <span className="nav-group-heading">
          <span>{title}</span>
          {!expanded && activeTitle && <small>{activeTitle}</small>}
        </span>
        <svg
          className="nav-group-chevron"
          data-expanded={expanded}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
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
      <div id={id} className="nav-group-items">
        {expanded && !compact && children}
      </div>
    </div>
  );
}
