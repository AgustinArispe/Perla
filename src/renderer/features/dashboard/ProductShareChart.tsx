import type { productShares } from './chart-data';

export const shareColors = ['#213f4b', '#997239', '#497269', '#607b94', '#977560', '#c6ced0'];
export function ProductShareChart({
  share,
  format,
}: {
  share: ReturnType<typeof productShares>;
  format: (value: number) => string;
}) {
  return (
    <div className="results-share">
      <div className="results-donut">
        <svg
          viewBox="0 0 120 120"
          role="img"
          aria-label={`Participación de los cinco productos principales y Otros. Total ${format(share.total)}`}
        >
          <circle cx="60" cy="60" r="46" fill="none" stroke="#edf0ee" strokeWidth="16" />
          {share.segments
            .filter((segment) => segment.value > 0)
            .map((segment, index) => {
              const percent = (100 * segment.value) / share.total,
                start =
                  (100 * share.segments.slice(0, index).reduce((sum, row) => sum + row.value, 0)) /
                  share.total;
              return (
                <circle
                  key={segment.id}
                  cx="60"
                  cy="60"
                  r="46"
                  pathLength="100"
                  fill="none"
                  stroke={shareColors[index]}
                  strokeWidth="16"
                  strokeDasharray={`${percent} ${100 - percent}`}
                  strokeDashoffset={-start}
                  transform="rotate(-90 60 60)"
                >
                  <title>
                    {segment.name}: {format(segment.value)} ·{' '}
                    {percent.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%
                  </title>
                </circle>
              );
            })}
        </svg>
        <div className="results-donut-center">
          <strong>
            {share.segments.length > 5
              ? 'Top 5'
              : `${share.segments.length} ${share.segments.length === 1 ? 'producto' : 'productos'}`}
          </strong>
          <span>
            {share.segments.some((segment) => segment.id === 'other') ? '+ Otros' : 'del período'}
          </span>
        </div>
      </div>
      <ul className="results-share-legend">
        {share.segments.map((segment, index) => (
          <li key={segment.id}>
            <i style={{ background: shareColors[index] }} />
            <span>{segment.name}</span>
            <strong>
              {((100 * segment.value) / share.total).toLocaleString('es-AR', {
                maximumFractionDigits: 1,
              })}
              %
            </strong>
            <small>{format(segment.value)}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
