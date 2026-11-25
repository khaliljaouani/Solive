export type CostKind = "mo" | "fourniture" | "sous-traitance";
export type QuoteMethod = "debourse" | "revient" | "vente";
export type ChantierStatus = "etude" | "en_cours" | "termine";
export type QuoteStatus = "brouillon" | "envoye" | "accepte" | "refuse";

export interface Chantier {
  id: string;
  name: string;
  client: string;
  address: string;
  trade: string;
  status: ChantierStatus;
  start: string;
  end: string;
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  hourlyCost: number;
}

export interface LibraryItem {
  id: string;
  label: string;
  unit: string;
  kind: CostKind;
  unitCost: number;
}

export interface QuoteLine {
  id: string;
  label: string;
  unit: string;
  qty: number;
  kind: CostKind;
  unitCost: number;
  unitSale: number;
}

export interface Quote {
  id: string;
  number: string;
  chantierId: string;
  title: string;
  status: QuoteStatus;
  method: QuoteMethod;
  overheadRate: number;
  targetMargin: number;
  coefficient: number;
  lines: QuoteLine[];
  createdAt: string;
}

export interface Situation {
  id: string;
  quoteId: string;
  number: number;
  date: string;
  kind: "situation" | "dgd";
  progress: Record<string, number>;
  retentionRate: number;
  prorataRate: number;
  vatRate: number;
  autoliquidation: boolean;
}

export interface Expense {
  id: string;
  chantierId: string;
  kind: CostKind;
  label: string;
  amount: number;
  date: string;
}

export interface Assignment {
  id: string;
  workerId: string;
  chantierId: string;
  date: string;
  hours: number;
}

export interface Company {
  name: string;
  siret: string;
  address: string;
  city: string;
  email: string;
  phone: string;
}

export interface SoliveState {
  version: 1;
  company: Company;
  chantiers: Chantier[];
  workers: Worker[];
  library: LibraryItem[];
  quotes: Quote[];
  situations: Situation[];
  expenses: Expense[];
  assignments: Assignment[];
}
