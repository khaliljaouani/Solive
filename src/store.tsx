import { createContext, useContext, useEffect, useMemo, useReducer, useState, type Dispatch, type ReactNode } from "react";
import { buildMetrics } from "./domain";
import type { Assignment, Chantier, Company, Expense, LibraryItem, Quote, QuoteLine, Situation, SoliveState, Worker } from "./types";

export type SaveStatus = "saved" | "saving" | "error";

type Action =
  | { type: "hydrate"; state: SoliveState }
  | { type: "patch-company"; company: Company }
  | { type: "add-chantier"; chantier: Chantier }
  | { type: "add-expense"; expense: Expense }
  | { type: "remove-expense"; id: string }
  | { type: "add-quote"; quote: Quote }
  | { type: "patch-quote"; id: string; patch: Partial<Omit<Quote, "id" | "lines">>; lines?: QuoteLine[] }
  | { type: "add-situation"; situation: Situation }
  | { type: "patch-situation"; id: string; patch: Partial<Omit<Situation, "id" | "quoteId">> }
  | { type: "remove-situation"; id: string }
  | { type: "set-assignment"; workerId: string; date: string; chantierId: string; hours: number }
  | { type: "add-worker"; worker: Worker }
  | { type: "remove-worker"; id: string }
  | { type: "patch-worker"; id: string; hourlyCost: number }
  | { type: "upsert-library"; item: LibraryItem }
  | { type: "remove-library"; id: string };

export function emptyState(): SoliveState {
  return {
    version: 1,
    company: { name: "", siret: "", address: "", city: "", email: "", phone: "" },
    chantiers: [],
    workers: [],
    library: [],
    quotes: [],
    situations: [],
    expenses: [],
    assignments: [],
  };
}

function reducer(state: SoliveState, action: Action): SoliveState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "patch-company":
      return { ...state, company: action.company };
    case "add-chantier":
      return { ...state, chantiers: [action.chantier, ...state.chantiers] };
    case "add-expense":
      return { ...state, expenses: [action.expense, ...state.expenses] };
    case "remove-expense":
      return { ...state, expenses: state.expenses.filter((expense) => expense.id !== action.id) };
    case "add-quote":
      return { ...state, quotes: [action.quote, ...state.quotes] };
    case "patch-quote":
      return {
        ...state,
        quotes: state.quotes.map((quote) =>
          quote.id === action.id ? { ...quote, ...action.patch, lines: action.lines ?? quote.lines } : quote,
        ),
      };
    case "add-situation":
      return { ...state, situations: [...state.situations, action.situation] };
    case "patch-situation":
      return {
        ...state,
        situations: state.situations.map((situation) =>
          situation.id === action.id ? { ...situation, ...action.patch } : situation,
        ),
      };
    case "remove-situation":
      return { ...state, situations: state.situations.filter((situation) => situation.id !== action.id) };
    case "set-assignment": {
      const rest = state.assignments.filter(
        (assignment) => !(assignment.workerId === action.workerId && assignment.date === action.date),
      );
      if (action.hours <= 0 || !action.chantierId) return { ...state, assignments: rest };
      const assignment: Assignment = {
        id: `a-${action.workerId}-${action.date}`,
        workerId: action.workerId,
        chantierId: action.chantierId,
        date: action.date,
        hours: action.hours,
      };
      return { ...state, assignments: [...rest, assignment] };
    }
    case "add-worker":
      return { ...state, workers: [...state.workers, action.worker] };
    case "remove-worker":
      return {
        ...state,
        workers: state.workers.filter((worker) => worker.id !== action.id),
        assignments: state.assignments.filter((assignment) => assignment.workerId !== action.id),
      };
    case "patch-worker":
      return {
        ...state,
        workers: state.workers.map((worker) =>
          worker.id === action.id ? { ...worker, hourlyCost: action.hourlyCost } : worker,
        ),
      };
    case "upsert-library": {
      const exists = state.library.some((item) => item.id === action.item.id);
      return {
        ...state,
        library: exists
          ? state.library.map((item) => (item.id === action.item.id ? action.item : item))
          : [...state.library, action.item],
      };
    }
    case "remove-library":
      return { ...state, library: state.library.filter((item) => item.id !== action.id) };
    default:
      return state;
  }
}

interface Store {
  state: SoliveState;
  dispatch: Dispatch<Action>;
  metrics: ReturnType<typeof buildMetrics>;
  ready: boolean;
  error: string | null;
  saveStatus: SaveStatus;
}

const Ctx = createContext<Store | null>(null);

export function SoliveProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, emptyState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/state")
      .then((response) => {
        if (!response.ok) throw new Error("Lecture impossible");
        return response.json() as Promise<SoliveState>;
      })
      .then((next) => {
        if (cancelled) return;
        dispatch({ type: "hydrate", state: next });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError("La base locale ne répond pas. Relance l'application avec npm run dev.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    setSaveStatus("saving");
    const timer = window.setTimeout(() => {
      fetch("/api/state", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(state),
      })
        .then((response) => {
          if (!response.ok) throw new Error("write");
          setSaveStatus("saved");
        })
        .catch(() => setSaveStatus("error"));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [state, ready]);

  const metrics = useMemo(() => buildMetrics(state), [state]);
  const value = useMemo(
    () => ({ state, dispatch, metrics, ready, error, saveStatus }),
    [state, metrics, ready, error, saveStatus],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSolive() {
  const store = useContext(Ctx);
  if (!store) throw new Error("SoliveProvider manquant");
  return store;
}
