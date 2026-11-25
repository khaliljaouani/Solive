import { useState } from "react";
import { PageHeader } from "../components/ui";
import { KIND_LABEL, KINDS, eur, uid } from "../format";
import { useSolive } from "../store";
import type { CostKind } from "../types";

export function Library() {
  const { state, dispatch } = useSolive();
  const [form, setForm] = useState({ label: "", unit: "u", kind: "fourniture" as CostKind, unitCost: "" });
  return (
    <>
      <PageHeader kicker="Prix" title="Bibliothèque" lede="Les prix copiés dans un devis restent figés, même si la bibliothèque change ensuite." />
      <form
        className="panel inline-form"
        onSubmit={(event) => {
          event.preventDefault();
          const unitCost = Number(form.unitCost);
          if (!form.label || !Number.isFinite(unitCost)) return;
          dispatch({
            type: "upsert-library",
            item: { id: uid(), label: form.label, unit: form.unit, kind: form.kind, unitCost },
          });
          setForm({ label: "", unit: "u", kind: form.kind, unitCost: "" });
        }}
      >
        <label className="field grow">Libellé<input required value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} /></label>
        <label className="field">Unité<input required value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} /></label>
        <label className="field">Nature
          <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as CostKind })}>
            {KINDS.map((kind) => <option key={kind} value={kind}>{KIND_LABEL[kind]}</option>)}
          </select>
        </label>
        <label className="field">Déboursé HT<input required type="number" min="0" step="0.01" value={form.unitCost} onChange={(event) => setForm({ ...form, unitCost: event.target.value })} /></label>
        <button className="primary" type="submit">Ajouter</button>
      </form>
      <div className="stack-gap" style={{ marginTop: 12 }}>
        {KINDS.map((kind) => (
          <section className="panel" key={kind}>
            <h2>{KIND_LABEL[kind]}</h2>
            <table>
              <tbody>
                {state.library.filter((item) => item.kind === kind).map((item) => (
                  <tr key={item.id}>
                    <td><input className="cell-input" value={item.label} onChange={(event) => dispatch({ type: "upsert-library", item: { ...item, label: event.target.value } })} /></td>
                    <td style={{ width: 90 }}><input className="cell-input" value={item.unit} onChange={(event) => dispatch({ type: "upsert-library", item: { ...item, unit: event.target.value } })} /></td>
                    <td className="num" style={{ width: 140 }}>
                      <input className="cell-input num" type="number" min="0" step="0.01" value={item.unitCost} onChange={(event) => dispatch({ type: "upsert-library", item: { ...item, unitCost: Number(event.target.value) } })} />
                    </td>
                    <td className="num" style={{ width: 120 }}>{eur(item.unitCost)}</td>
                    <td><button type="button" className="danger" onClick={() => dispatch({ type: "remove-library", id: item.id })}>Retirer</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </>
  );
}
