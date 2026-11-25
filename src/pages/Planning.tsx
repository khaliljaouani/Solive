import { Fragment, useMemo, useState } from "react";
import { PageHeader } from "../components/ui";
import { addDays, chantierColor, dateFr, dayMonth, eur, mondayOf, toISODate, uid, weekdayShort } from "../format";
import { useSolive } from "../store";

export function Planning() {
  const { state, dispatch } = useSolive();
  const [offset, setOffset] = useState(0);
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<{ workerId: string; date: string } | null>(null);
  const days = useMemo(() => {
    const start = addDays(mondayOf(new Date()), offset * 7);
    return Array.from({ length: 5 }, (_, index) => toISODate(addDays(start, index)));
  }, [offset]);
  const selectedWorker = state.workers.find((worker) => worker.id === selected?.workerId);
  const selectedAssignment = state.assignments.find(
    (assignment) => assignment.workerId === selected?.workerId && assignment.date === selected.date,
  );
  const weekCost = state.assignments
    .filter((assignment) => days.includes(assignment.date))
    .reduce((sum, assignment) => {
      const worker = state.workers.find((item) => item.id === assignment.workerId);
      return sum + assignment.hours * (worker?.hourlyCost ?? 0);
    }, 0);
  const [workerForm, setWorkerForm] = useState({ name: "", role: "", hourlyCost: "32" });
  const message = planningMessage(state.company.name, state.workers, state.chantiers, state.assignments, days);

  return (
    <>
      <PageHeader kicker="Équipe" title="Planning" lede="Le pointage de la semaine alimente le coût de main-d'œuvre de chaque chantier.">
        <button type="button" className="ghost" onClick={() => setOffset((value) => value - 1)}>Semaine précédente</button>
        <button type="button" className="ghost" onClick={() => setOffset(0)}>Cette semaine</button>
        <button type="button" className="ghost" onClick={() => setOffset((value) => value + 1)}>Semaine suivante</button>
      </PageHeader>
      <p className="hint">Semaine du {dateFr(days[0])} · coût pointé {eur(weekCost)}</p>
      <div className="panel" style={{ marginTop: 12 }}>
        <div className="plan-wrap">
          <div className="plan">
            <div />
            {days.map((day) => (
              <div key={day} className="plan-head">{weekdayShort(day)} {dayMonth(day)}</div>
            ))}
            {state.workers.length === 0 ? <p className="hint" style={{ gridColumn: "1 / -1" }}>Aucun compagnon. Ajoute l'équipe plus bas.</p> : null}
            {state.workers.map((worker) => (
              <Fragment key={worker.id}>
                <div className="worker-name">
                  <strong>{worker.name}</strong>
                  {worker.role}
                </div>
                {days.map((day) => {
                  const assignment = state.assignments.find((item) => item.workerId === worker.id && item.date === day);
                  const active = selected?.workerId === worker.id && selected.date === day;
                  return (
                    <button
                      key={`${worker.id}-${day}`}
                      type="button"
                      className={active ? "slot on" : "slot"}
                      onClick={() => setSelected({ workerId: worker.id, date: day })}
                    >
                      {assignment ? (
                        <>
                          <i style={{ background: chantierColor(assignment.chantierId, state.chantiers) }} />
                          {assignment.hours}h
                        </>
                      ) : (
                        <span className="slot-empty">—</span>
                      )}
                    </button>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
        {selected && selectedWorker && state.chantiers.length === 0 ? (
          <p className="hint">Crée un chantier avant d'affecter cette journée.</p>
        ) : null}
        {selected && selectedWorker && state.chantiers.length > 0 ? (
          <form
            key={`${selected.workerId}-${selected.date}`}
            className="assign inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              dispatch({
                type: "set-assignment",
                workerId: selected.workerId,
                date: selected.date,
                chantierId: String(data.get("chantier") ?? ""),
                hours: Number(data.get("hours") ?? 0),
              });
            }}
          >
            <div className="assign-head">
              <strong>{selectedWorker.name} · {dateFr(selected.date)}</strong>
            </div>
            <label className="field grow">Chantier
              <select name="chantier" defaultValue={selectedAssignment?.chantierId ?? state.chantiers[0]?.id}>
                {state.chantiers.map((chantier) => <option key={chantier.id} value={chantier.id}>{chantier.name}</option>)}
              </select>
            </label>
            <label className="field">Heures
              <input name="hours" type="number" min={0} max={12} step={0.5} defaultValue={selectedAssignment?.hours ?? 8} />
            </label>
            <button className="primary" type="submit">Enregistrer</button>
            <button
              className="ghost"
              type="button"
              onClick={() => dispatch({ type: "set-assignment", workerId: selected.workerId, date: selected.date, chantierId: "", hours: 0 })}
            >
              Effacer
            </button>
          </form>
        ) : <p className="hint">Choisissez une case pour affecter un compagnon.</p>}
      </div>
      <section className="panel" style={{ marginTop: 12 }}>
        <div className="toolbar">
          <h2>Message à transmettre</h2>
          <button
            type="button"
            className="ghost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(message);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "Message copié" : "Copier le message"}
          </button>
        </div>
        <textarea readOnly value={message} />
      </section>
      <section className="panel" style={{ marginTop: 12 }}>
        <h2>Équipe</h2>
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            const hourlyCost = Number(workerForm.hourlyCost);
            if (!workerForm.name.trim() || !Number.isFinite(hourlyCost)) return;
            dispatch({
              type: "add-worker",
              worker: {
                id: uid(),
                name: workerForm.name.trim(),
                role: workerForm.role.trim() || "Compagnon",
                hourlyCost,
              },
            });
            setWorkerForm({ name: "", role: "", hourlyCost: workerForm.hourlyCost });
          }}
        >
          <label className="field grow">Nom<input required value={workerForm.name} onChange={(event) => setWorkerForm({ ...workerForm, name: event.target.value })} /></label>
          <label className="field">Métier<input value={workerForm.role} onChange={(event) => setWorkerForm({ ...workerForm, role: event.target.value })} placeholder="Couvreur" /></label>
          <label className="field">Coût horaire HT<input required type="number" min="0" step="0.5" value={workerForm.hourlyCost} onChange={(event) => setWorkerForm({ ...workerForm, hourlyCost: event.target.value })} /></label>
          <button className="primary" type="submit">Ajouter</button>
        </form>
        <div className="stack-gap" style={{ marginTop: 14 }}>
          {state.workers.map((worker) => (
            <div className="split" key={worker.id}>
              <label className="field">
                {worker.name} · {worker.role}
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={worker.hourlyCost}
                  onChange={(event) => dispatch({ type: "patch-worker", id: worker.id, hourlyCost: Number(event.target.value) })}
                />
              </label>
              <button type="button" className="danger" onClick={() => dispatch({ type: "remove-worker", id: worker.id })}>Retirer</button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function planningMessage(
  company: string,
  workers: { id: string; name: string }[],
  chantiers: { id: string; name: string }[],
  assignments: { workerId: string; chantierId: string; date: string; hours: number }[],
  days: string[],
) {
  const lines = workers.flatMap((worker) => {
    const bits = days.flatMap((day) => {
      const assignment = assignments.find((item) => item.workerId === worker.id && item.date === day);
      if (!assignment) return [];
      const chantier = chantiers.find((item) => item.id === assignment.chantierId);
      return [`${weekdayShort(day)} ${chantier?.name ?? "chantier"} ${assignment.hours}h`];
    });
    return bits.length ? [`${worker.name} : ${bits.join(", ")}`] : [];
  });
  return [`Planning ${company} — semaine du ${dateFr(days[0])}`, ...lines].join("\n");
}
