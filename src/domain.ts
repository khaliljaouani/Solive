import { toISODate, uid } from "./format";
import type {
  Chantier,
  CostKind,
  Quote,
  QuoteLine,
  Situation,
  SoliveState,
} from "./types";

export interface Statement {
  cumulativeHT: number;
  previousHT: number;
  periodHT: number;
  retention: number;
  prorata: number;
  retentionReleased: number;
  base: number;
  vat: number;
  net: number;
  isFinal: boolean;
}

export interface ChantierMetrics {
  chantier: Chantier;
  sale: number;
  cost: number;
  revient: number;
  spent: number;
  spentByKind: Record<CostKind, number>;
  budgetByKind: Record<CostKind, number>;
  invoiced: number;
  remaining: number;
  coverage: number;
  theoreticalMargin: number | null;
  expectedCost: number | null;
}

export interface Alert {
  chantierId: string;
  kind: "variance" | "overrun";
  amount: number;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function emptyKinds(): Record<CostKind, number> {
  return { mo: 0, fourniture: 0, "sous-traitance": 0 };
}

export function lineCost(line: QuoteLine) {
  return line.qty * line.unitCost;
}

export function lineSale(line: QuoteLine, quote: Quote) {
  const cost = lineCost(line);
  if (quote.method === "debourse") return cost * quote.coefficient;
  if (quote.method === "vente") return line.qty * line.unitSale;
  const revient = cost * (1 + quote.overheadRate);
  if (quote.targetMargin >= 0.95) return revient;
  return revient / (1 - quote.targetMargin);
}

export function quoteTotals(quote: Quote) {
  const cost = quote.lines.reduce((sum, line) => sum + lineCost(line), 0);
  const revient = cost * (1 + quote.overheadRate);
  const sale = quote.lines.reduce((sum, line) => sum + lineSale(line, quote), 0);
  const margin = sale > 0 ? (sale - revient) / sale : 0;
  const coefficient = cost > 0 ? sale / cost : 0;
  return { cost, revient, sale, margin, coefficient };
}

export function cumulative(quote: Quote, progress: Record<string, number>) {
  return quote.lines.reduce(
    (sum, line) => sum + lineSale(line, quote) * clamp01(progress[line.id] ?? 0),
    0,
  );
}

export function progressCost(quote: Quote, progress: Record<string, number>) {
  return quote.lines.reduce(
    (sum, line) => sum + lineCost(line) * clamp01(progress[line.id] ?? 0),
    0,
  );
}

export function latestSituation(situations: Situation[], quoteId: string) {
  return situations
    .filter((situation) => situation.quoteId === quoteId)
    .sort((a, b) => a.number - b.number)
    .at(-1);
}

export function isLatest(situation: Situation, situations: Situation[]) {
  return latestSituation(situations, situation.quoteId)?.id === situation.id;
}

export function previousProgress(situation: Situation, situations: Situation[], lineId: string) {
  const ordered = situations
    .filter((item) => item.quoteId === situation.quoteId)
    .sort((a, b) => a.number - b.number);
  const index = ordered.findIndex((item) => item.id === situation.id);
  if (index <= 0) return 0;
  return ordered[index - 1].progress[lineId] ?? 0;
}

export function statement(quote: Quote, situation: Situation, situations: Situation[]): Statement {
  const ordered = situations
    .filter((item) => item.quoteId === quote.id)
    .sort((a, b) => a.number - b.number);
  const index = ordered.findIndex((item) => item.id === situation.id);
  const cumulativeHT = cumulative(quote, situation.progress);
  const previousHT = index > 0 ? cumulative(quote, ordered[index - 1].progress) : 0;
  const periodHT = cumulativeHT - previousHT;
  const isFinal = situation.kind === "dgd";
  const retention = isFinal ? 0 : periodHT * situation.retentionRate;
  const prorata = periodHT * situation.prorataRate;
  let retentionReleased = 0;
  if (isFinal) {
    for (let cursor = 0; cursor < index; cursor += 1) {
      const current = ordered[cursor];
      const before = cursor === 0 ? 0 : cumulative(quote, ordered[cursor - 1].progress);
      const period = cumulative(quote, current.progress) - before;
      retentionReleased += period * current.retentionRate;
    }
  }
  const base = periodHT - retention - prorata + retentionReleased;
  const vat = situation.autoliquidation ? 0 : base * situation.vatRate;
  return {
    cumulativeHT,
    previousHT,
    periodHT,
    retention,
    prorata,
    retentionReleased,
    base,
    vat,
    net: base + vat,
    isFinal,
  };
}

export function blankQuote(chantier: Chantier, existing: number): Quote {
  const year = new Date().getFullYear();
  return {
    id: uid(),
    number: `DEV-${year}-${String(existing + 12).padStart(3, "0")}`,
    chantierId: chantier.id,
    title: `Devis ${chantier.name}`,
    status: "brouillon",
    method: "revient",
    overheadRate: 0.15,
    targetMargin: 0.2,
    coefficient: 1.55,
    lines: [],
    createdAt: toISODate(new Date()),
  };
}

export function nextSituation(
  quote: Quote,
  situations: Situation[],
  kind: Situation["kind"],
): Situation {
  const previous = latestSituation(situations, quote.id);
  const progress: Record<string, number> = {};
  for (const line of quote.lines) {
    const before = previous?.progress[line.id] ?? 0;
    progress[line.id] = kind === "dgd" ? 1 : before;
  }
  return {
    id: uid(),
    quoteId: quote.id,
    number: (previous?.number ?? 0) + 1,
    date: toISODate(new Date()),
    kind,
    progress,
    retentionRate: kind === "dgd" ? 0 : (previous?.retentionRate ?? 0.05),
    prorataRate: previous?.prorataRate ?? 0,
    vatRate: previous?.vatRate ?? 0.2,
    autoliquidation: previous?.autoliquidation ?? false,
  };
}

export function buildMetrics(state: SoliveState) {
  const rows: ChantierMetrics[] = state.chantiers.map((chantier) => {
    const accepted = state.quotes.filter(
      (quote) => quote.chantierId === chantier.id && quote.status === "accepte",
    );
    const budgetByKind = emptyKinds();
    let sale = 0;
    let cost = 0;
    let revient = 0;
    let invoiced = 0;
    let expectedCost: number | null = null;
    for (const quote of accepted) {
      const totals = quoteTotals(quote);
      sale += totals.sale;
      cost += totals.cost;
      revient += totals.revient;
      for (const line of quote.lines) budgetByKind[line.kind] += lineCost(line);
      const situation = latestSituation(state.situations, quote.id);
      if (!situation) continue;
      invoiced += cumulative(quote, situation.progress);
      expectedCost = (expectedCost ?? 0) + progressCost(quote, situation.progress);
    }
    const spentByKind = emptyKinds();
    for (const expense of state.expenses) {
      if (expense.chantierId === chantier.id) spentByKind[expense.kind] += expense.amount;
    }
    for (const assignment of state.assignments) {
      if (assignment.chantierId !== chantier.id) continue;
      const worker = state.workers.find((item) => item.id === assignment.workerId);
      spentByKind.mo += assignment.hours * (worker?.hourlyCost ?? 0);
    }
    const spent = spentByKind.mo + spentByKind.fourniture + spentByKind["sous-traitance"];
    return {
      chantier,
      sale,
      cost,
      revient,
      spent,
      spentByKind,
      budgetByKind,
      invoiced,
      remaining: cost - spent,
      coverage: invoiced - spent,
      theoreticalMargin: sale > 0 ? (sale - revient) / sale : null,
      expectedCost,
    };
  });
  const rank = { en_cours: 0, etude: 1, termine: 2 };
  rows.sort(
    (a, b) =>
      rank[a.chantier.status] - rank[b.chantier.status] ||
      a.chantier.name.localeCompare(b.chantier.name, "fr"),
  );
  const totals = rows.reduce(
    (sum, row) => ({
      sale: sum.sale + row.sale,
      spent: sum.spent + row.spent,
      remaining: sum.remaining + row.remaining,
      coverage: sum.coverage + row.coverage,
      invoiced: sum.invoiced + row.invoiced,
    }),
    { sale: 0, spent: 0, remaining: 0, coverage: 0, invoiced: 0 },
  );
  const alerts: Alert[] = [];
  for (const row of rows) {
    if (row.expectedCost !== null && row.spent - row.expectedCost > 800) {
      alerts.push({
        chantierId: row.chantier.id,
        kind: "variance",
        amount: row.spent - row.expectedCost,
      });
    }
    if (row.cost > 0 && row.remaining < -1) {
      alerts.push({
        chantierId: row.chantier.id,
        kind: "overrun",
        amount: Math.abs(row.remaining),
      });
    }
  }
  return { rows, totals, alerts };
}
