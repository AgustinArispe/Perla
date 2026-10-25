import { useId, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

const sectionIcons = {
  'Ventas y caja': 'cash',
  Mercadería: 'box',
  Gestión: 'chart',
  Administración: 'settings',
} as const;

export function SidebarGroup({
  title,
  activeTitle,
  compact,
  onCompactOpen,
  children,
}: {
  title: string;
  activeTitle?: string | undefined;
  compact: boolean;
  onCompactOpen: () => void;
  children: ReactNode;
}) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
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
