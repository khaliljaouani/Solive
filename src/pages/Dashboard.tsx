import { Link } from "react-router-dom";
import { Meter, PageHeader, Pill } from "../components/ui";
import { statement } from "../domain";
import {
  CHANTIER_LABEL,
  chantierTone,
  csvNum,
  dateFr,
  downloadCsv,
  eur,
  pct,
  toISODate,
} from "../format";
import { useSolive } from "../store";

export function Dashboard() {
  const { state, metrics } = useSolive();
  const month = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const spentTotal = metrics.totals.spent || 1;
  return (
    <>
      <PageHeader
        kicker={month}
        title="Rentabilité des chantiers"
        lede="Le chiffre d'affaires signé, les dépenses et la facturation de chaque chantier, au même endroit."
      >
        <button type="button" className="primary" onClick={() => exportInvoices(state)}>
          Exporter les factures
        </button>
      </PageHeader>
      <section className="kpis">
        <article className="kpi">
          <span>CA signé HT</span>
          <strong>{eur(metrics.totals.sale)}</strong>
          <em>Devis acceptés</em>
        </article>
        <article className="kpi">
          <span>Dépensé</span>
          <strong>{eur(metrics.totals.spent)}</strong>
          <em>Factures et pointage</em>
        </article>
        <article className="kpi">
          <span>Reste à dépenser</span>
          <strong className={metrics.totals.remaining < 0 ? "neg" : undefined}>{eur(metrics.totals.remaining)}</strong>
          <em>Budget déboursé − dépenses</em>
        </article>
        <article className="kpi">
          <span>Facturé − dépensé</span>
          <strong className={metrics.totals.coverage < 0 ? "neg" : "pos"}>{eur(metrics.totals.coverage)}</strong>
          <em>Facturé {eur(metrics.totals.invoiced)}</em>
        </article>
      </section>
      <div className="layout-2">
        <section className="panel">
          <h2>Chantiers</h2>
          {metrics.rows.length === 0 ? (
            <p className="hint">Aucun chantier. <Link to="/chantiers">Créer le premier chantier</Link> pour suivre sa marge.</p>
          ) : null}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Chantier</th>
                  <th>Statut</th>
                  <th className="num">CA signé</th>
                  <th className="num">Facturé</th>
                  <th className="num">Dépensé</th>
                  <th>Budget</th>
                </tr>
              </thead>
              <tbody>
                {metrics.rows.map((row) => (
                  <tr key={row.chantier.id}>
                    <td>
                      <Link className="row-link" to={`/chantiers/${row.chantier.id}`}>
                        {row.chantier.name}
                      </Link>
                      <div className="hint">{row.chantier.client}</div>
                    </td>
                    <td>
                      <Pill tone={chantierTone(row.chantier.status)}>{CHANTIER_LABEL[row.chantier.status]}</Pill>
                    </td>
                    <td className="num">{eur(row.sale)}</td>
                    <td className="num">{eur(row.invoiced)}</td>
                    <td className="num">{eur(row.spent)}</td>
                    <td style={{ minWidth: 110 }}>
                      <Meter value={row.spent} max={row.cost} />
                      <div className="hint">{row.cost > 0 ? pct(row.spent / row.cost) : "Sans devis"}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <div className="stack-gap">
          <section className="panel">
            <h2>Dépenses par nature</h2>
            <div className="mix" aria-hidden="true">
              <i className="swatch-mo" style={{ width: `${(metrics.rows.reduce((s, r) => s + r.spentByKind.mo, 0) / spentTotal) * 100}%` }} />
              <i className="swatch-fourniture" style={{ width: `${(metrics.rows.reduce((s, r) => s + r.spentByKind.fourniture, 0) / spentTotal) * 100}%` }} />
              <i className="swatch-sous-traitance" style={{ width: `${(metrics.rows.reduce((s, r) => s + r.spentByKind["sous-traitance"], 0) / spentTotal) * 100}%` }} />
            </div>
            <ul className="legend">
              <li><i className="swatch-mo" />Main-d'œuvre {eur(metrics.rows.reduce((s, r) => s + r.spentByKind.mo, 0))}</li>
              <li><i className="swatch-fourniture" />Fournitures {eur(metrics.rows.reduce((s, r) => s + r.spentByKind.fourniture, 0))}</li>
              <li><i className="swatch-sous-traitance" />Sous-traitance {eur(metrics.rows.reduce((s, r) => s + r.spentByKind["sous-traitance"], 0))}</li>
            </ul>
          </section>
          <section className="panel">
            <h2>À surveiller</h2>
            {metrics.alerts.length === 0 ? <p className="hint">Aucun chantier ne sort du budget ou de l'avancement.</p> : null}
            {metrics.alerts.map((alert) => {
              const chantier = state.chantiers.find((item) => item.id === alert.chantierId);
              return (
                <article className="alert" key={`${alert.chantierId}-${alert.kind}`}>
                  <strong>{chantier?.name}</strong>
                  <p>
                    {alert.kind === "variance"
                      ? `Les dépenses dépassent de ${eur(alert.amount)} le déboursé correspondant à l'avancement.`
                      : `Le budget déboursé est dépassé de ${eur(alert.amount)}.`}
                  </p>
                  <Link to={`/chantiers/${alert.chantierId}`}>Ouvrir le chantier</Link>
                </article>
              );
            })}
          </section>
        </div>
      </div>
    </>
  );
}

function exportInvoices(state: ReturnType<typeof useSolive>["state"]) {
  const rows = [[
    "Date",
    "Pièce",
    "Client",
    "Chantier",
    "HT période",
    "Retenue",
    "Prorata",
    "Libération retenue",
    "TVA",
    "Net à payer",
  ]];
  const situations = [...state.situations].sort((a, b) => a.date.localeCompare(b.date) || a.number - b.number);
  for (const situation of situations) {
    const quote = state.quotes.find((item) => item.id === situation.quoteId);
    if (!quote) continue;
    const chantier = state.chantiers.find((item) => item.id === quote.chantierId);
    const bill = statement(quote, situation, state.situations);
    rows.push([
      dateFr(situation.date),
      situation.kind === "dgd" ? `${quote.number}-DGD` : `${quote.number}-S${situation.number}`,
      chantier?.client ?? "",
      chantier?.name ?? "",
      csvNum(bill.periodHT),
      csvNum(bill.retention),
      csvNum(bill.prorata),
      csvNum(bill.retentionReleased),
      csvNum(bill.vat),
      csvNum(bill.net),
    ]);
  }
  downloadCsv(`solive-factures-${toISODate(new Date())}.csv`, rows);
}
