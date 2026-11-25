import { useState } from "react";
import { emptyState, useSolive } from "../store";
import type { Company } from "../types";

export function CompanyForm({ mode }: { mode: "create" | "edit" }) {
  const { state, dispatch } = useSolive();
  const [form, setForm] = useState<Company>(state.company);
  const [notice, setNotice] = useState("");

  function update(key: keyof Company, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault();
        const name = form.name.trim();
        if (!name) return;
        dispatch({ type: "patch-company", company: { ...form, name } });
        setNotice(mode === "create" ? "" : "Entreprise enregistrée.");
      }}
    >
      <label className="field">
        Raison sociale
        <input required value={form.name} onChange={(event) => update("name", event.target.value)} />
      </label>
      <label className="field">
        SIRET
        <input value={form.siret} inputMode="numeric" onChange={(event) => update("siret", event.target.value)} placeholder="14 chiffres" />
      </label>
      <label className="field">
        Adresse
        <input value={form.address} onChange={(event) => update("address", event.target.value)} />
      </label>
      <label className="field">
        Ville
        <input value={form.city} onChange={(event) => update("city", event.target.value)} />
      </label>
      <label className="field">
        E-mail
        <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
      </label>
      <label className="field">
        Téléphone
        <input value={form.phone} onChange={(event) => update("phone", event.target.value)} />
      </label>
      <button className="primary" type="submit">{mode === "create" ? "Créer l'entreprise" : "Enregistrer"}</button>
      {notice ? <p className="hint">{notice}</p> : null}
    </form>
  );
}

export function Setup() {
  return (
    <div className="setup-screen">
      <section className="setup-card">
        <p className="kicker">Solive</p>
        <h1>Créer l'entreprise</h1>
        <p className="lede">
          Les chantiers, devis, situations et plannings sont enregistrés dans une base sur cet ordinateur.
        </p>
        <CompanyForm mode="create" />
      </section>
    </div>
  );
}

export function Entreprise() {
  const { dispatch } = useSolive();
  return (
    <>
      <header className="page-head">
        <div>
          <p className="kicker">Paramètres</p>
          <h1>Entreprise</h1>
          <p className="lede">Ces informations identifient les exports et les messages de planning.</p>
        </div>
      </header>
      <section className="panel" style={{ maxWidth: 640 }}>
        <CompanyForm mode="edit" />
      </section>
      <section className="panel" style={{ maxWidth: 640, marginTop: 12 }}>
        <h2>Effacer les données</h2>
        <p className="hint">Supprime l'entreprise, les chantiers, les devis, les situations et le planning de la base locale.</p>
        <button
          type="button"
          className="danger"
          onClick={() => {
            if (window.confirm("Effacer toutes les données de Solive ? Cette action est définitive.")) {
              dispatch({ type: "hydrate", state: emptyState() });
            }
          }}
        >
          Effacer toutes les données
        </button>
      </section>
    </>
  );
}
