import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Modal, PageHeader, Pill } from "../components/ui";
import { blankQuote, lineCost, lineSale, quoteTotals } from "../domain";
import { KIND_LABEL, KINDS, METHOD_LABEL, QUOTE_LABEL, eur, pct, qty, quoteTone, uid } from "../format";
import { useSolive } from "../store";
import type { CostKind, Quote, QuoteLine, QuoteMethod, QuoteStatus } from "../types";

export function DevisList() {
  const { state, dispatch } = useSolive();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [chantierId, setChantierId] = useState(state.chantiers[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const rows = useMemo(
    () => [...state.quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.quotes],
  );
  return (
    <>
      <PageHeader kicker="Chiffrage" title="Devis" lede="Trois lectures du même poste : déboursé sec, prix de revient ou prix de vente.">
        <button type="button" className="primary" onClick={() => setOpen(true)} disabled={state.chantiers.length === 0}>Nouveau devis</button>
      </PageHeader>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Chantier</th>
              <th>Statut</th>
              <th className="num">Déboursé</th>
              <th className="num">Vente HT</th>
              <th className="num">Marge</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((quote) => {
              const totals = quoteTotals(quote);
              const chantier = state.chantiers.find((item) => item.id === quote.chantierId);
              return (
                <tr key={quote.id}>
                  <td><Link className="row-link" to={`/devis/${quote.id}`}>{quote.number}</Link><div className="hint">{quote.title}</div></td>
                  <td>{chantier?.name}</td>
                  <td><Pill tone={quoteTone(quote.status)}>{QUOTE_LABEL[quote.status]}</Pill></td>
                  <td className="num">{eur(totals.cost)}</td>
                  <td className="num">{eur(totals.sale)}</td>
                  <td className="num">{pct(totals.margin)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {open ? (
        <Modal title="Nouveau devis" onClose={() => setOpen(false)}>
          <form
            className="form"
            onSubmit={(event) => {
              event.preventDefault();
              const chantier = state.chantiers.find((item) => item.id === chantierId);
              if (!chantier) return;
              const quote = blankQuote(chantier, state.quotes.length);
              if (title.trim()) quote.title = title.trim();
              dispatch({ type: "add-quote", quote });
              navigate(`/devis/${quote.id}`);
            }}
          >
            <label className="field">Chantier
              <select value={chantierId} onChange={(event) => setChantierId(event.target.value)}>
                {state.chantiers.map((chantier) => <option key={chantier.id} value={chantier.id}>{chantier.name}</option>)}
              </select>
            </label>
            <label className="field">Titre<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Laisser vide pour un titre automatique" /></label>
            <button className="primary" type="submit">Créer le devis</button>
          </form>
        </Modal>
      ) : null}
    </>
  );
}

export function DevisEditor() {
  const { id } = useParams();
  const { state, dispatch } = useSolive();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [search, setSearch] = useState("");
  const quote = state.quotes.find((item) => item.id === id);
  if (!quote) return <p>Devis introuvable.</p>;
  const chantier = state.chantiers.find((item) => item.id === quote.chantierId);
  const totals = quoteTotals(quote);
  const library = state.library.filter((item) => item.label.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr")));

  function patch(patchQuote: Partial<Omit<Quote, "id" | "lines">>, lines?: QuoteLine[]) {
    dispatch({ type: "patch-quote", id: quote!.id, patch: patchQuote, lines });
  }

  function changeMethod(method: QuoteMethod) {
    if (method === "vente") {
      const lines = quote!.lines.map((line) => ({
        ...line,
        unitSale: line.qty > 0 ? lineSale(line, quote!) / line.qty : line.unitSale,
      }));
      patch({ method }, lines);
      return;
    }
    patch({ method });
  }

  function updateLine(lineId: string, linePatch: Partial<QuoteLine>) {
    patch({}, quote!.lines.map((line) => (line.id === lineId ? { ...line, ...linePatch } : line)));
  }

  return (
    <>
      <PageHeader kicker={quote.number} title={quote.title} lede={chantier ? chantier.name : ""}>
        <Link to={chantier ? `/chantiers/${chantier.id}` : "/devis"}>Retour chantier</Link>
      </PageHeader>
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Méthode de chiffrage">
          {(Object.keys(METHOD_LABEL) as QuoteMethod[]).map((method) => (
            <button key={method} type="button" className={quote.method === method ? "on" : ""} onClick={() => changeMethod(method)}>
              {METHOD_LABEL[method]}
            </button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="Statut du devis">
          {(["brouillon", "envoye", "accepte", "refuse"] as QuoteStatus[]).map((status) => (
            <button key={status} type="button" className={quote.status === status ? "on" : ""} onClick={() => patch({ status })}>
              {QUOTE_LABEL[status]}
            </button>
          ))}
        </div>
      </div>
      <div className="rates">
        <label className="field">Frais généraux %
          <input type="number" min={0} max={80} step={0.1} value={roundPercent(quote.overheadRate)} onChange={(event) => patch({ overheadRate: Number(event.target.value) / 100 })} />
        </label>
        {quote.method === "revient" ? (
          <label className="field">Marge cible %
            <input type="number" min={0} max={80} step={0.1} value={roundPercent(quote.targetMargin)} onChange={(event) => patch({ targetMargin: Number(event.target.value) / 100 })} />
          </label>
        ) : (
          <div className="field">Marge obtenue<strong>{pct(totals.margin)}</strong></div>
        )}
        {quote.method === "debourse" ? (
          <label className="field">Coefficient
            <input type="number" min={1} max={4} step={0.01} value={quote.coefficient} onChange={(event) => patch({ coefficient: Number(event.target.value) })} />
          </label>
        ) : (
          <div className="field">Coefficient réel<strong>{qty(totals.coefficient)}</strong></div>
        )}
      </div>
      <p className="hint" style={{ margin: "12px 0" }}>
        Le prix de revient ajoute les frais généraux au déboursé. La marge se calcule ensuite sur le prix de vente.
      </p>
      <div className="panel table-wrap sheet">
        <div className="toolbar">
          <strong>Postes</strong>
          <div className="page-actions">
            <button type="button" className="ghost" onClick={() => setLibraryOpen(true)}>Depuis la bibliothèque</button>
            <button
              type="button"
              className="ghost"
              onClick={() => patch({}, [...quote.lines, { id: uid(), label: "Nouveau poste", unit: "u", qty: 1, kind: "mo", unitCost: 0, unitSale: 0 }])}
            >
              Ligne vide
            </button>
          </div>
        </div>
        {quote.lines.length === 0 ? <p className="hint">Ajoutez un poste pour commencer le chiffrage.</p> : null}
        <table>
          <thead>
            <tr>
              <th>Poste</th>
              <th>Nature</th>
              <th>Unité</th>
              <th className="num">Qté</th>
              <th className="num">Déboursé u.</th>
              <th className="num">Déboursé</th>
              <th className="num">Vente u.</th>
              <th className="num">Total HT</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {quote.lines.map((line) => {
              const sale = lineSale(line, quote);
              const unit = line.qty > 0 ? sale / line.qty : 0;
              return (
                <tr key={line.id}>
                  <td><input className="cell-input" value={line.label} onChange={(event) => updateLine(line.id, { label: event.target.value })} /></td>
                  <td>
                    <select className="cell-input" value={line.kind} onChange={(event) => updateLine(line.id, { kind: event.target.value as CostKind })}>
                      {KINDS.map((kind) => <option key={kind} value={kind}>{KIND_LABEL[kind]}</option>)}
                    </select>
                  </td>
                  <td><input className="cell-input" value={line.unit} onChange={(event) => updateLine(line.id, { unit: event.target.value })} /></td>
                  <td><input className="cell-input num" type="number" step="0.01" value={line.qty} onChange={(event) => updateLine(line.id, { qty: Number(event.target.value) })} /></td>
                  <td><input className="cell-input num" type="number" min="0" step="0.01" value={line.unitCost} onChange={(event) => updateLine(line.id, { unitCost: Number(event.target.value) })} /></td>
                  <td className="num">{eur(lineCost(line))}</td>
                  <td className="num">
                    {quote.method === "vente" ? (
                      <input className="cell-input num" type="number" min="0" step="0.01" value={line.unitSale} onChange={(event) => updateLine(line.id, { unitSale: Number(event.target.value) })} />
                    ) : eur(unit)}
                  </td>
                  <td className="num">{eur(sale)}</td>
                  <td><button type="button" className="danger" onClick={() => patch({}, quote.lines.filter((item) => item.id !== line.id))}>Retirer</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="totals">
          <div><span>Déboursé sec</span><strong>{eur(totals.cost)}</strong></div>
          <div><span>Prix de revient</span><strong>{eur(totals.revient)}</strong></div>
          <div><span>Prix de vente HT</span><strong>{eur(totals.sale)}</strong></div>
          <div><span>Marge</span><strong className={totals.margin < 0 ? "neg" : undefined}>{pct(totals.margin)}</strong></div>
          <div><span>Coefficient</span><strong>{qty(totals.coefficient)}</strong></div>
        </div>
      </div>
      {libraryOpen ? (
        <Modal title="Bibliothèque de prix" onClose={() => setLibraryOpen(false)}>
          <label className="field">Rechercher<input value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <div className="lib-list">
            {library.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  patch({}, [...quote.lines, {
                    id: uid(),
                    label: item.label,
                    unit: item.unit,
                    qty: 1,
                    kind: item.kind,
                    unitCost: item.unitCost,
                    unitSale: 0,
                  }]);
                  setLibraryOpen(false);
                }}
              >
                <strong>{item.label}</strong>
                <div className="hint">{KIND_LABEL[item.kind]} · {eur(item.unitCost)} / {item.unit}</div>
              </button>
            ))}
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function roundPercent(rate: number) {
  return Math.round(rate * 1000) / 10;
}
