import { RANKING_LIMITS, type RankingLimit } from '../../../domain/ranking';
export function RankingLimitSelect({
  value,
  onChange,
  categories = false,
}: {
  value: RankingLimit;
  onChange: (value: RankingLimit) => void;
  categories?: boolean;
}) {
  return (
    <label className="field">
      Mostrar
      <select
        aria-label={categories ? 'Mostrar categorías' : 'Mostrar productos'}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) as RankingLimit)}
      >
        {RANKING_LIMITS.map((limit) => (
          <option key={limit} value={limit}>
            Top {limit}
          </option>
        ))}
      </select>
    </label>
  );
}
