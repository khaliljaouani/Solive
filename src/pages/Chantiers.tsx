import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Meter, Modal, PageHeader, Pill } from "../components/ui";
import { blankQuote } from "../domain";
import { CHANTIER_LABEL, KIND_LABEL, KINDS, chantierTone, dateFr, eur, pct, toISODate, uid } from "../format";
import { useSolive } from "../store";
import type { ChantierStatus, CostKind, Expense } from "../types";

export function Chantiers() {
  const { metrics, dispatch } = useSolive();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    name: "",
    client: "",
    address: "",
    trade: "",
    status: "etude" as ChantierStatus,
  });
  const shown = metrics.rows.filter((row) => {
    const haystack = `${row.chantier.name} ${row.chantier.client} ${row.chantier.trade}`.toLocaleLowerCase("fr");
    return haystack.includes(query.toLocaleLowerCase("fr"));
  });
  return (
    <>
      <PageHeader kicker="Portefeuille" title="Chantiers" lede="Chaque affaire garde son budget, ses dépenses et son avancement.">
        <button type="button" className="primary" onClick={() => setOpen(true)}>Nouveau chantier</button>
      </PageHeader>
      <label className="field grow" style={{ maxWidth: 360, marginBottom: 14 }}>
        Rechercher
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom, client, métier" />
      </label>
      <div className="cards">
        {shown.map((row) => (
          <Link className="card" key={row.chantier.id} to={`/chantiers/${row.chantier.id}`}>
            <header>
              <div>
                <h2>{row.chantier.name}</h2>
                <p>{row.chantier.client} · {row.chantier.trade}</p>
              </div>
              <Pill tone={chantierTone(row.chantier.status)}>{CHANTIER_LABEL[row.chantier.status]}</Pill>
            </header>
            <Meter value={row.spent} max={row.cost} />
            <dl className="stats">
              <div><dt>CA signé</dt><dd>{eur(row.sale)}</dd></div>
              <div><dt>Dépensé</dt><dd>{eur(row.spent)}</dd></div>
              <div><dt>Reste</dt><dd className={row.remaining < 0 ? "neg" : undefined}>{eur(row.remaining)}</dd></div>
            </dl>
          </Link>
        ))}
      </div>
      {shown.length === 0 ? <p className="hint">{query ? "Aucun chantier ne correspond." : "Aucun chantier pour le moment."}</p> : null}
      {open ? (
        <Modal title="Nouveau chantier" onClose={() => setOpen(false)}>
          <form
            className="form"
            onSubmit={(event) => {
              event.preventDefault();
              const today = toISODate(new Date());
              const chantier = {
                id: uid(),
                ...form,
                start: today,
                end: today,
              };
              dispatch({ type: "add-chantier", chantier });
              navigate(`/chantiers/${chantier.id}`);
            }}
          >
            <label className="field">Nom<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="field">Client<input required value={form.client} onChange={(event) => setForm({ ...form, client: event.target.value })} /></label>
            <label className="field">Adresse<input required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
            <label className="field">Métier<input required value={form.trade} onChange={(event) => setForm({ ...form, trade: event.target.value })} placeholder="Couverture, électricité…" /></label>
            <label className="field">
              Statut
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ChantierStatus })}>
                <option value="etude">Étude</option>
                <option value="en_cours">En cours</option>
                <option value="termine">Terminé</option>
              </select>
            </label>
            <button className="primary" type="submit">Créer le chantier</button>
          </form>
        </Modal>
      ) : null}
    </>
  );
}

export function ChantierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, metrics, dispatch } = useSolive();
  const row = metrics.rows.find((item) => item.chantier.id === id);
  const [expense, setExpense] = useState({ label: "", amount: "", kind: "fourniture" as CostKind, date: toISODate(new Date()) });
  if (!row) return <p>Chantier introuvable.</p>;
  const { chantier } = row;
  const quotes = state.quotes.filter((quote) => quote.chantierId === chantier.id);
  const expenses = state.expenses.filter((item) => item.chantierId === chantier.id);
  const variance = row.expectedCost === null ? null : row.spent - row.expectedCost;
  return (
    <>
      <PageHeader kicker={chantier.trade} title={chantier.name} lede={`${chantier.client} · ${chantier.address}`}>
        <Pill tone={chantierTone(chantier.status)}>{CHANTIER_LABEL[chantier.status]}</Pill>
        <button
          type="button"
          className="primary"
          onClick={() => {
            const quote = blankQuote(chantier, state.quotes.length);
            dispatch({ type: "add-quote", quote });
            navigate(`/devis/${quote.id}`);
          }}
        >
          Nouveau devis
        </button>
      </PageHeader>
      <p className="hint">{dateFr(chantier.start)} → {dateFr(chantier.end)}</p>
      <section className="kpis" style={{ marginTop: 14 }}>
        <article className="kpi"><span>CA signé HT</span><strong>{eur(row.sale)}</strong><em>{row.theoreticalMargin === null ? "Pas de devis accepté" : `Marge théorique ${pct(row.theoreticalMargin)}`}</em></article>
        <article className="kpi"><span>Facturé HT</span><strong>{eur(row.invoiced)}</strong><em>{row.sale > 0 ? pct(row.invoiced / row.sale) + " du marché" : "—"}</em></article>
        <article className="kpi"><span>Dépensé</span><strong>{eur(row.spent)}</strong><em>{row.expectedCost === null ? "Pas encore d'avancement" : `Avancement déboursé ${eur(row.expectedCost)}`}</em></article>
        <article className="kpi"><span>Reste à dépenser</span><strong className={row.remaining < 0 ? "neg" : undefined}>{eur(row.remaining)}</strong><em className={row.coverage < 0 ? "neg" : undefined}>Facturé − dépensé {eur(row.coverage)}</em></article>
      </section>
      {variance !== null && variance > 800 ? (
        <p className="note">Les dépenses dépassent de {eur(variance)} le déboursé correspondant à l'avancement.</p>
      ) : null}
      <div className="layout-2">
        <section className="panel">
          <h2>Budget et dépenses</h2>
          <table>
            <thead>
              <tr><th>Nature</th><th className="num">Budget déboursé</th><th className="num">Dépensé</th><th className="num">Écart</th></tr>
            </thead>
            <tbody>
              {KINDS.map((kind) => {
                const gap = row.spentByKind[kind] - row.budgetByKind[kind];
                return (
                  <tr key={kind}>
                    <td>{KIND_LABEL[kind]}</td>
                    <td className="num">{eur(row.budgetByKind[kind])}</td>
                    <td className="num">{eur(row.spentByKind[kind])}</td>
                    <td className={`num ${gap > 1 ? "neg" : ""}`}>{eur(gap)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <h2 style={{ marginTop: 22 }}>Factures et coûts saisis</h2>
          {expenses.length === 0 ? <p className="hint">Aucune facture saisie. Le pointage du planning s'ajoute à la main-d'œuvre.</p> : null}
          <table>
            <tbody>
              {expenses.map((item) => (
                <tr key={item.id}>
                  <td>{item.label}<div className="hint">{dateFr(item.date)} · {KIND_LABEL[item.kind]}</div></td>
                  <td className="num">{eur(item.amount)}</td>
                  <td className="num"><button type="button" className="danger" onClick={() => dispatch({ type: "remove-expense", id: item.id })}>Retirer</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <form
            className="inline-form"
            style={{ marginTop: 12 }}
            onSubmit={(event) => {
              event.preventDefault();
              const amount = Number(expense.amount);
              if (!expense.label || !Number.isFinite(amount) || amount <= 0) return;
              const next: Expense = {
                id: uid(),
                chantierId: chantier.id,
                label: expense.label,
                amount,
                kind: expense.kind,
                date: expense.date,
              };
              dispatch({ type: "add-expense", expense: next });
              setExpense({ ...expense, label: "", amount: "" });
            }}
          >
            <label className="field grow">Libellé<input required value={expense.label} onChange={(event) => setExpense({ ...expense, label: event.target.value })} /></label>
            <label className="field">Nature
              <select value={expense.kind} onChange={(event) => setExpense({ ...expense, kind: event.target.value as CostKind })}>
                {KINDS.map((kind) => <option key={kind} value={kind}>{KIND_LABEL[kind]}</option>)}
              </select>
            </label>
            <label className="field">Montant HT<input required type="number" min="0" step="0.01" value={expense.amount} onChange={(event) => setExpense({ ...expense, amount: event.target.value })} /></label>
            <label className="field">Date<input required type="date" value={expense.date} onChange={(event) => setExpense({ ...expense, date: event.target.value })} /></label>
            <button className="primary" type="submit">Ajouter une dépense</button>
          </form>
        </section>
        <section className="panel">
          <h2>Devis</h2>
          {quotes.length === 0 ? <p className="hint">Pas encore de devis.</p> : null}
          {quotes.map((quote) => (
            <p key={quote.id}>
              <Link to={`/devis/${quote.id}`}>{quote.number}</Link>
              <span className="hint"> · {quote.title}</span>
            </p>
          ))}
          <p className="hint">La main-d'œuvre pointée dans le planning est comptée automatiquement, sans double saisie.</p>
          <Link to="/planning">Ouvrir le planning</Link>
        </section>
      </div>
    </>
  );
}
