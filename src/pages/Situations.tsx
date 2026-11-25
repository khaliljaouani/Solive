import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader, Pill } from "../components/ui";
import { isLatest, latestSituation, lineSale, nextSituation, previousProgress, statement } from "../domain";
import { dateFr, eur, pct } from "../format";
import { useSolive } from "../store";
import type { Situation } from "../types";

export function Situations() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useSolive();
  const [open, setOpen] = useState(false);
  const accepted = state.quotes.filter((quote) => quote.status === "accepte" && latestSituation(state.situations, quote.id)?.kind !== "dgd");
  const [quoteId, setQuoteId] = useState(accepted[0]?.id ?? "");

  if (!id) {
    const rows = [...state.situations].sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number);
    return (
      <>
        <PageHeader kicker="Facturation" title="Situations" lede="L'avancement de chaque poste calcule la situation, la retenue de garantie et le net à payer.">
          <button type="button" className="primary" onClick={() => setOpen(true)} disabled={accepted.length === 0}>
            Nouvelle situation
          </button>
        </PageHeader>
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pièce</th>
                <th>Date</th>
                <th>Chantier</th>
                <th className="num">HT période</th>
                <th className="num">Net à payer</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((situation) => {
                const quote = state.quotes.find((item) => item.id === situation.quoteId);
                if (!quote) return null;
                const chantier = state.chantiers.find((item) => item.id === quote.chantierId);
                const bill = statement(quote, situation, state.situations);
                return (
                  <tr key={situation.id}>
                    <td>
                      <Link className="row-link" to={`/situations/${situation.id}`}>
                        {situation.kind === "dgd" ? "DGD" : `Situation ${situation.number}`}
                      </Link>
                      <div className="hint">{quote.number}</div>
                    </td>
                    <td>{dateFr(situation.date)}</td>
                    <td>{chantier?.name}</td>
                    <td className="num">{eur(bill.periodHT)}</td>
                    <td className="num">{eur(bill.net)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {open ? (
          <div className="modal-back" onClick={() => setOpen(false)}>
            <form
              className="modal form"
              role="dialog"
              aria-label="Nouvelle situation"
              onClick={(event) => event.stopPropagation()}
              onSubmit={(event) => {
                event.preventDefault();
                const quote = state.quotes.find((item) => item.id === quoteId);
                if (!quote) return;
                const situation = nextSituation(quote, state.situations, "situation");
                dispatch({ type: "add-situation", situation });
                navigate(`/situations/${situation.id}`);
              }}
            >
              <div className="modal-head">
                <h2>Nouvelle situation</h2>
                <button type="button" className="ghost" onClick={() => setOpen(false)}>Fermer</button>
              </div>
              <label className="field">Devis accepté
                <select value={quoteId} onChange={(event) => setQuoteId(event.target.value)}>
                  {accepted.map((quote) => {
                    const chantier = state.chantiers.find((item) => item.id === quote.chantierId);
                    return <option key={quote.id} value={quote.id}>{quote.number} — {chantier?.name}</option>;
                  })}
                </select>
              </label>
              <button className="primary" type="submit">Créer la situation</button>
            </form>
          </div>
        ) : null}
      </>
    );
  }

  const situation = state.situations.find((item) => item.id === id);
  const quote = state.quotes.find((item) => item.id === situation?.quoteId);
  if (!situation || !quote) return <p>Situation introuvable.</p>;
  const chantier = state.chantiers.find((item) => item.id === quote.chantierId);
  const bill = statement(quote, situation, state.situations);
  const latest = isLatest(situation, state.situations);
  const locked = !latest || situation.kind === "dgd";
  const hasDgd = state.situations.some((item) => item.quoteId === quote.id && item.kind === "dgd");

  function patch(partial: Partial<Omit<Situation, "id" | "quoteId">>) {
    dispatch({ type: "patch-situation", id: situation!.id, patch: partial });
  }

  return (
    <>
      <PageHeader
        kicker={quote.number}
        title={situation.kind === "dgd" ? "Décompte général et définitif" : `Situation n°${situation.number}`}
        lede={chantier?.name}
      >
        <Link to="/situations">Toutes les situations</Link>
        {latest && situation.kind !== "dgd" && !hasDgd ? (
          <button
            type="button"
            className="primary"
            onClick={() => {
              const dgd = nextSituation(quote!, state.situations, "dgd");
              dispatch({ type: "add-situation", situation: dgd });
              navigate(`/situations/${dgd.id}`);
            }}
          >
            Établir le DGD
          </button>
        ) : null}
        {latest ? (
          <button
            type="button"
            className="danger"
            onClick={() => {
              dispatch({ type: "remove-situation", id: situation!.id });
              navigate("/situations");
            }}
          >
            Supprimer
          </button>
        ) : null}
      </PageHeader>
      {!latest ? <p className="note">Cette situation est figée : une pièce plus récente reprend son avancement.</p> : null}
      <div className="layout-2">
        <section className="panel table-wrap">
          <div className="rates" style={{ marginBottom: 12 }}>
            <label className="field">Date
              <input type="date" disabled={locked} value={situation.date} onChange={(event) => patch({ date: event.target.value })} />
            </label>
            <label className="field">Retenue %
              <input type="number" min={0} max={20} step={0.1} disabled={locked || situation.kind === "dgd"} value={roundPercent(situation.retentionRate)} onChange={(event) => patch({ retentionRate: Number(event.target.value) / 100 })} />
            </label>
            <label className="field">Compte prorata %
              <input type="number" min={0} max={20} step={0.1} disabled={locked} value={roundPercent(situation.prorataRate)} onChange={(event) => patch({ prorataRate: Number(event.target.value) / 100 })} />
            </label>
            <label className="field">TVA
              <select value={String(situation.vatRate)} disabled={locked || situation.autoliquidation} onChange={(event) => patch({ vatRate: Number(event.target.value) })}>
                <option value="0.055">5,5 %</option>
                <option value="0.1">10 %</option>
                <option value="0.2">20 %</option>
              </select>
            </label>
            <label className="field">Autoliquidation
              <input type="checkbox" disabled={locked} checked={situation.autoliquidation} onChange={(event) => patch({ autoliquidation: event.target.checked })} />
            </label>
          </div>
          <table>
            <thead>
              <tr>
                <th>Poste</th>
                <th className="num">Vente HT</th>
                <th>Avancement</th>
                <th className="num">Cette situation</th>
              </tr>
            </thead>
            <tbody>
              {quote.lines.map((line) => {
                const previous = previousProgress(situation, state.situations, line.id);
                const current = Math.max(previous, situation.progress[line.id] ?? previous);
                const sale = lineSale(line, quote);
                return (
                  <tr key={line.id}>
                    <td>{line.label}<div className="hint">Déjà {pct(previous)}</div></td>
                    <td className="num">{eur(sale)}</td>
                    <td>
                      <input
                        type="range"
                        min={Math.round(previous * 100)}
                        max={100}
                        step={1}
                        disabled={locked}
                        value={Math.round(current * 100)}
                        onChange={(event) => {
                          const value = Math.max(previous, Math.min(1, Number(event.target.value) / 100));
                          patch({ progress: { ...situation.progress, [line.id]: value } });
                        }}
                      />
                      <div>{pct(current)}</div>
                    </td>
                    <td className="num">{eur(sale * (current - previous))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h2>Récapitulatif</h2>
          <dl className="recap">
            <div><dt>Cumul HT</dt><dd>{eur(bill.cumulativeHT)}</dd></div>
            <div><dt>Déjà facturé</dt><dd>{eur(bill.previousHT)}</dd></div>
            <div><dt>Situation HT</dt><dd>{eur(bill.periodHT)}</dd></div>
            <div><dt>Retenue de garantie</dt><dd>{eur(bill.retention)}</dd></div>
            <div><dt>Compte prorata</dt><dd>{eur(bill.prorata)}</dd></div>
            {bill.isFinal ? <div><dt>Libération de retenue</dt><dd>{eur(bill.retentionReleased)}</dd></div> : null}
            <div><dt>Base</dt><dd>{eur(bill.base)}</dd></div>
            <div><dt>TVA</dt><dd>{eur(bill.vat)}</dd></div>
            <div className="net"><dt>Net à payer</dt><dd>{eur(bill.net)}</dd></div>
          </dl>
          {situation.autoliquidation ? (
            <p className="note">Autoliquidation : TVA due par le preneur, article 283-2 nonies du CGI.</p>
          ) : null}
          {situation.kind === "dgd" ? <Pill tone="pine">Pièce définitive</Pill> : null}
        </section>
      </div>
    </>
  );
}

function roundPercent(rate: number) {
  return Math.round(rate * 1000) / 10;
}
