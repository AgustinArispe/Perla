import type { CSSProperties } from 'react';

const paths = {
  box: 'M3 7l9-4 9 4v10l-9 4-9-4V7z M3 7l9 4 9-4 M12 11v10',
  cash: 'M3 4h18v6H3z M5 10v10h14V10 M9 16h6 M8 7h1 M15 7h1',
  stock: 'M4 4h16v16H4z M4 10h16 M10 4v6 M8 14h8 M8 17h5',
  history: 'M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5',
  chart: 'M4 3v18h18 M8 17v-5 M13 17V8 M18 17V4',
  settings: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
  search: 'M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  plus: 'M12 5v14 M5 12h14',
  upload: 'M12 16V3 M7 8l5-5 5 5 M4 15v6h16v-6',
  close: 'M6 6l12 12 M6 18L18 6',
  edit: 'M4 16l12-12 4 4L8 20H4v-4z M13 7l4 4',
  arrow: 'M4 12h16 M14 6l6 6-6 6',
  check: 'M5 12l4 4L19 6',
} as const;
export function Icon({
  name,
  size = 22,
  style,
}: {
  name: keyof typeof paths;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
