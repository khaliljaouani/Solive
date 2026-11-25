import { NavLink, Route, Routes } from "react-router-dom";
import { useSolive } from "./store";
import { ChantierDetail, Chantiers } from "./pages/Chantiers";
import { Dashboard } from "./pages/Dashboard";
import { DevisEditor, DevisList } from "./pages/Devis";
import { Entreprise, Setup } from "./pages/Entreprise";
import { Library } from "./pages/Library";
import { Planning } from "./pages/Planning";
import { Situations } from "./pages/Situations";

const LINKS = [
  ["/", "Tableau de bord"],
  ["/chantiers", "Chantiers"],
  ["/devis", "Devis"],
  ["/situations", "Situations"],
  ["/planning", "Planning"],
  ["/bibliotheque", "Bibliothèque"],
  ["/entreprise", "Entreprise"],
] as const;

export default function App() {
  const { ready, error, state } = useSolive();
  if (error) {
    return (
      <div className="setup-screen">
        <section className="setup-card">
          <h1>Base indisponible</h1>
          <p className="lede">{error}</p>
          <button type="button" className="primary" onClick={() => window.location.reload()}>Réessayer</button>
        </section>
      </div>
    );
  }
  if (!ready) return <div className="setup-screen"><p>Ouverture de la base…</p></div>;
  if (!state.company.name.trim()) return <Setup />;
  return <Shell />;
}

function Shell() {
  const { state, saveStatus } = useSolive();
  const saveLabel = saveStatus === "saving" ? "Enregistrement…" : saveStatus === "error" ? "Échec de l'enregistrement" : "Enregistré sur cet ordinateur";
  return (
    <div className="app">
      <aside>
        <div className="brand">
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
            <rect width="28" height="28" rx="7" fill="#2a211c" />
            <rect x="5" y="8" width="18" height="4" rx="1" fill="#e6b089" />
            <rect x="5" y="16" width="14" height="4" rx="1" fill="#d07a45" />
          </svg>
          <div>
            <strong>Solive</strong>
            <span>Chantier et marge</span>
          </div>
        </div>
        <nav className="nav" aria-label="Navigation">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : undefined)}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="aside-foot">
          <span>Entreprise</span>
          <strong>{state.company.name}</strong>
          <span className={saveStatus === "error" ? "neg" : undefined}>{saveLabel}</span>
        </div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/chantiers" element={<Chantiers />} />
          <Route path="/chantiers/:id" element={<ChantierDetail />} />
          <Route path="/devis" element={<DevisList />} />
          <Route path="/devis/:id" element={<DevisEditor />} />
          <Route path="/situations" element={<Situations />} />
          <Route path="/situations/:id" element={<Situations />} />
          <Route path="/planning" element={<Planning />} />
          <Route path="/bibliotheque" element={<Library />} />
          <Route path="/entreprise" element={<Entreprise />} />
          <Route path="*" element={<p>Cette page n'existe pas.</p>} />
        </Routes>
      </main>
    </div>
  );
}
