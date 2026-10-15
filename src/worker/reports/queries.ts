import type Database from 'better-sqlite3';
import {
  MonthSchema,
  type MonthlyReport,
  type ReportTotals,
  type RankedProduct,
  type ProfitabilityBreakdown,
  type ComparisonRequest,
  type PeriodComparison,
} from '../../shared/reports';
import { DomainError } from '../../shared/errors';
import { monthPeriods } from './month';
import { comparisonPeriods } from './period';
type Row = Record<string, string | bigint | null>;
const integer = (v: bigint | string | null | undefined) => {
  const n = Number(v ?? 0);
  if (!Number.isSafeInteger(n))
    throw new DomainError('VALIDATION', 'El resumen supera el rango de importes seguros.');
  return n;
};
const ratio = (amount: number, base: number) =>
  base ? integer((BigInt(amount) * 10000n) / BigInt(base)) : 0;
// Every branch uses its own movement date. Return lines retain the original sale's
// product identity and the cost captured when the return was confirmed.
const movementLines = `WITH movements AS (
  SELECT i.product_id,i.unit,i.name,i.category_name,i.quantity_base quantity,i.net_cents net,
    i.cost_cents cost,s.business_date date,s.number sale_number,i.position,i.id movement_id
  FROM sale_items i JOIN sales s ON s.id=i.sale_id
  WHERE s.status='COMPLETED' AND s.business_date BETWEEN ? AND ?
  UNION ALL
  SELECT i.product_id,i.unit,i.name,i.category_name,-ri.quantity_base,-ri.net_cents,
    -ri.cost_cents,sr.business_date,s.number,i.position,ri.id
  FROM sale_return_items ri JOIN sale_returns sr ON sr.id=ri.return_id
  JOIN sale_items i ON i.id=ri.sale_item_id JOIN sales s ON s.id=i.sale_id
  WHERE sr.status='CONFIRMED' AND sr.business_date BETWEEN ? AND ?
)`;
export class MonthlyReports {
  constructor(private readonly db: Database.Database) {}
  private rows(sql: string, ...args: string[]): Row[] {
    return this.db
      .prepare(sql)
      .safeIntegers(true)
      .all(...args) as Row[];
  }
  private totals(from: string, to: string): ReportTotals {
    const r = this.rows(
      `SELECT COALESCE(SUM(CASE WHEN status='COMPLETED' THEN subtotal_cents ELSE 0 END),0) gross,COALESCE(SUM(CASE WHEN status='COMPLETED' THEN discount_cents ELSE 0 END),0) discount,COALESCE(SUM(CASE WHEN status='COMPLETED' THEN total_cents ELSE 0 END),0) net,COUNT(CASE WHEN status='COMPLETED' THEN 1 END) count,COUNT(CASE WHEN status='VOIDED' THEN 1 END) void_count,COALESCE(SUM(CASE WHEN status='VOIDED' THEN total_cents ELSE 0 END),0) void_net FROM sales WHERE business_date BETWEEN ? AND ?`,
      from,
      to,
    )[0]!;
    const returned = this.rows(
      `SELECT COALESCE(SUM(ri.gross_cents),0) gross,COALESCE(SUM(ri.discount_cents),0) discount,COALESCE(SUM(ri.net_cents),0) net
       FROM sale_return_items ri JOIN sale_returns sr ON sr.id=ri.return_id
       WHERE sr.status='CONFIRMED' AND sr.business_date BETWEEN ? AND ?`,
      from,
      to,
    )[0]!;
    const net = integer(r.net) - integer(returned.net),
      count = integer(r.count);
    return {
      grossCents: integer(r.gross) - integer(returned.gross),
      discountCents: integer(r.discount) - integer(returned.discount),
      netCents: net,
      saleCount: count,
      averageCents: count
        ? integer((BigInt(net) + BigInt(Math.floor(count / 2))) / BigInt(count))
        : 0,
      voidedCount: integer(r.void_count),
      voidedCents: integer(r.void_net),
    };
  }
  private daily(from: string, to: string): MonthlyReport['daily'] {
    const rows = this.rows(
      `SELECT date,SUM(net) net,SUM(count) count FROM (
        SELECT business_date date,total_cents net,1 count FROM sales
        WHERE status='COMPLETED' AND business_date BETWEEN ? AND ?
        UNION ALL
        SELECT sr.business_date,-ri.net_cents,0 FROM sale_return_items ri
        JOIN sale_returns sr ON sr.id=ri.return_id
        WHERE sr.status='CONFIRMED' AND sr.business_date BETWEEN ? AND ?
      ) GROUP BY date`,
      from,
      to,
      from,
      to,
    );
    const byDate = new Map(rows.map((row) => [String(row.date), row]));
    const start = new Date(`${from}T00:00:00Z`).getTime();
    const end = new Date(`${to}T00:00:00Z`).getTime();
    return Array.from({ length: (end - start) / 86400000 + 1 }, (_, index) => {
      const date = new Date(start + index * 86400000).toISOString().slice(0, 10);
      const row = byDate.get(date);
      return { date, netCents: integer(row?.net), saleCount: integer(row?.count) };
    });
  }
  period(from: string, to: string) {
    return this.db.transaction(() => {
      const profit = this.rows(
        `${movementLines}
         SELECT COALESCE(SUM(cost),0) cost,
           COALESCE(SUM(CASE WHEN cost IS NOT NULL THEN net ELSE 0 END),0) covered,
           COALESCE(SUM(ABS(net)),0) movement_net,
           COALESCE(SUM(CASE WHEN cost IS NOT NULL THEN ABS(net) ELSE 0 END),0) covered_movement_net,
           COUNT(CASE WHEN cost IS NULL THEN 1 END) missing FROM movements`,
        from,
        to,
        from,
        to,
      )[0]!;
      const totals = this.totals(from, to);
      const knownCostCents = integer(profit.cost),
        coveredNetCents = integer(profit.covered);
      return {
        totals,
        profitability: {
          knownCostCents,
          coveredNetCents,
          grossMarginCents: coveredNetCents - knownCostCents,
          coverageBasisPoints: ratio(
            integer(profit.covered_movement_net),
            integer(profit.movement_net),
          ),
          coverageBasis: 'ABSOLUTE_MOVEMENT_NET' as const,
          missingLineCount: integer(profit.missing),
        },
      };
    })();
  }
  currentTotals(input: ComparisonRequest, now = new Date()): ReportTotals {
    const period = comparisonPeriods(input, now);
    return this.db.transaction(() => this.totals(period.from, period.to))();
  }
  compare(input: ComparisonRequest, now = new Date()): PeriodComparison {
    const period = comparisonPeriods(input, now);
    return this.db.transaction(() => {
      const current = this.totals(period.from, period.to),
        previous = this.totals(period.previousFrom, period.previousTo);
      return {
        preset: input.preset,
        period,
        current,
        previous,
        changeBasisPoints: previous.netCents
          ? ratio(current.netCents - previous.netCents, previous.netCents)
          : null,
      };
    })();
  }
  month(raw: string, now = new Date(), fullBreakdown = false): MonthlyReport {
    const month = MonthSchema.parse(raw),
      period = monthPeriods(month, now);
    return this.db.transaction(() => {
      const totals = this.totals(period.from, period.to),
        previous = this.totals(period.previousFrom, period.previousTo);
      const args = [month, period.from, period.to];
      const paymentRows = this.rows(
        `SELECT p.method,SUM(p.amount_cents) amount,COUNT(DISTINCT p.sale_id) count FROM sale_payments p JOIN sales s ON s.id=p.sale_id WHERE s.status='COMPLETED' AND s.local_month=? AND s.business_date BETWEEN ? AND ? GROUP BY p.method`,
        ...args,
      );
      const refundRows = this.rows(
        `SELECT f.method,SUM(f.amount_cents) amount,COUNT(DISTINCT f.return_id) count FROM sale_return_refunds f JOIN sale_returns r ON r.id=f.return_id WHERE r.status='CONFIRMED' AND r.local_month=? AND r.business_date BETWEEN ? AND ? GROUP BY f.method`,
        ...args,
      );
      const payments = (['CASH', 'DEBIT', 'CREDIT', 'TRANSFER', 'OTHER'] as const).map((method) => {
        const r = paymentRows.find((r) => r.method === method);
        const refund = refundRows.find((row) => row.method === method);
        const amountCents = integer(r?.amount) - integer(refund?.amount),
          saleCount = integer(r?.count);
        return {
          method,
          amountCents,
          saleCount,
          refundCount: integer(refund?.count),
          shareBasisPoints: ratio(amountCents, totals.netCents),
          saleShareBasisPoints: ratio(saleCount, totals.saleCount),
        };
      });
      const ranked = this.rows(
        `${movementLines}, filtered AS (
          SELECT *,ROW_NUMBER() OVER(PARTITION BY product_id,unit ORDER BY date DESC,sale_number DESC,position DESC,movement_id DESC) latest
          FROM movements
        ) SELECT product_id,unit,MAX(CASE WHEN latest=1 THEN name END) name,
          SUM(quantity) quantity,SUM(net) net FROM filtered
          GROUP BY product_id,unit ORDER BY net DESC,product_id,unit`,
        period.from,
        period.to,
        period.from,
        period.to,
      ).map((r) => ({
        productId: String(r.product_id),
        unit: r.unit as RankedProduct['unit'],
        name: String(r.name),
        quantityBase: integer(r.quantity),
        netCents: integer(r.net),
      }));
      const productRanks = new Map(
        ranked.map((p, index) => [p.productId, { product: p, rank: index + 1 }]),
      );
      const byQuantity = (unit: RankedProduct['unit']) =>
        ranked
          .filter((p) => p.unit === unit)
          .sort(
            (a, b) => b.quantityBase - a.quantityBase || a.productId.localeCompare(b.productId),
          );
      const lowStock = this.rows(
        `SELECT p.id,p.name,p.sale_unit,b.quantity_base,p.min_stock_base FROM products p JOIN inventory_balances b ON b.product_id=p.id WHERE p.active=1 AND p.track_stock=1 AND p.stock_initialized=1 AND b.quantity_base<=p.min_stock_base ORDER BY b.quantity_base,p.name`,
      ).map((r) => {
        const productId = String(r.id),
          ranking = productRanks.get(productId),
          quantityBase = integer(r.quantity_base);
        return {
          productId,
          name: String(r.name),
          unit: r.sale_unit as RankedProduct['unit'],
          quantityBase,
          minStockBase: integer(r.min_stock_base),
          soldBase: ranking?.product.quantityBase ?? 0,
          revenueRank: ranking?.rank ?? null,
          state:
            quantityBase < 0
              ? ('NEGATIVE' as const)
              : quantityBase === 0
                ? ('EMPTY' as const)
                : ('LOW' as const),
        };
      });
      const daily = this.daily(period.from, period.to);
      const previousDaily = this.daily(period.previousFrom, period.previousTo);
      const changed = this.rows(
        `SELECT MAX(changed) changed FROM (
          SELECT e.created_at_utc changed FROM sale_events e JOIN sales s ON s.id=e.sale_id
          WHERE s.business_date BETWEEN ? AND ?
          UNION ALL
          SELECT e.created_at_utc changed FROM sale_return_events e JOIN sale_returns r ON r.id=e.return_id
          WHERE r.status='CONFIRMED' AND r.business_date BETWEEN ? AND ?
        )`,
        period.from,
        period.to,
        period.from,
        period.to,
      )[0]?.changed;
      const periodProfit = this.period(period.from, period.to).profitability;
      const profitBreakdown = (group: 'product' | 'category'): ProfitabilityBreakdown[] => {
        const groupId =
          group === 'product' ? 'product_id' : "COALESCE(category_name,'Sin categoría')";
        const groupName =
          group === 'product' ? 'MAX(name)' : "COALESCE(category_name,'Sin categoría')";
        return this.rows(
          `${movementLines} SELECT ${groupId} id,${groupName} name,SUM(net) net,
            COALESCE(SUM(CASE WHEN cost IS NOT NULL THEN net ELSE 0 END),0) covered,
            COALESCE(SUM(cost),0) cost,SUM(ABS(net)) movement_net,
            SUM(CASE WHEN cost IS NOT NULL THEN ABS(net) ELSE 0 END) covered_movement_net
            FROM movements GROUP BY ${groupId} ORDER BY net DESC,id LIMIT ${fullBreakdown ? 50001 : 20}`,
          period.from,
          period.to,
          period.from,
          period.to,
        ).map((row) => {
          const netCents = integer(row.net),
            coveredNetCents = integer(row.covered),
            knownCostCents = integer(row.cost);
          return {
            id: String(row.id),
            name: String(row.name),
            netCents,
            coveredNetCents,
            knownCostCents,
            grossMarginCents: coveredNetCents - knownCostCents,
            coverageBasisPoints: ratio(
              integer(row.covered_movement_net),
              integer(row.movement_net),
            ),
          };
        });
      };
      const knownCostCents = periodProfit.knownCostCents,
        coveredNetCents = periodProfit.coveredNetCents;
      return {
        month,
        definitionVersion: 2 as const,
        period,
        generatedAt: now.toISOString(),
        lastChangedAt: changed === null || changed === undefined ? null : String(changed),
        totals,
        comparison: {
          previous,
          changeBasisPoints: previous.netCents
            ? ratio(totals.netCents - previous.netCents, previous.netCents)
            : null,
        },
        payments,
        cardCents: payments
          .filter((p) => p.method === 'DEBIT' || p.method === 'CREDIT')
          .reduce((sum, p) => sum + p.amountCents, 0),
        daily,
        previousDaily,
        rankings: { revenue: ranked, units: byQuantity('UNIT'), kilos: byQuantity('KG') },
        profitability: {
          knownCostCents,
          coveredNetCents,
          grossMarginCents: coveredNetCents - knownCostCents,
          coverageBasisPoints: periodProfit.coverageBasisPoints,
          coverageBasis: periodProfit.coverageBasis,
          missingLineCount: periodProfit.missingLineCount,
          products: profitBreakdown('product'),
          categories: profitBreakdown('category'),
        },
        lowStock,
      };
    })();
  }
}
