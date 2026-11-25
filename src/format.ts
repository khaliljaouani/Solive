import type { ChantierStatus, CostKind, QuoteStatus } from "./types";

export const KINDS: CostKind[] = ["mo", "fourniture", "sous-traitance"];

export const KIND_LABEL: Record<CostKind, string> = {
  mo: "Main-d'œuvre",
  fourniture: "Fournitures",
  "sous-traitance": "Sous-traitance",
};

export const CHANTIER_LABEL: Record<ChantierStatus, string> = {
  etude: "Étude",
  en_cours: "En cours",
  termine: "Terminé",
};

export const QUOTE_LABEL: Record<QuoteStatus, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
};

export const METHOD_LABEL = {
  debourse: "Déboursé sec",
  revient: "Prix de revient",
  vente: "Prix de vente",
} as const;

const SWATCHES = ["#b85a2a", "#2f6b4f", "#3d5a80", "#8a6232", "#6d4c7d"];

export function chantierColor(id: string, chantiers: { id: string }[]) {
  const index = Math.max(0, chantiers.findIndex((chantier) => chantier.id === id));
  return SWATCHES[index % SWATCHES.length];
}

export function chantierTone(status: ChantierStatus) {
  if (status === "en_cours") return "pine";
  if (status === "etude") return "gold";
  return "mute";
}

export function quoteTone(status: QuoteStatus) {
  if (status === "accepte") return "pine";
  if (status === "envoye") return "copper";
  if (status === "refuse") return "clay";
  return "mute";
}

export function eur(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

export function pct(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

export function qty(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
}

export function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function mondayOf(base: Date) {
  const date = new Date(base);
  date.setHours(12, 0, 0, 0);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return date;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function dateFr(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function dayMonth(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function weekdayShort(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short" });
}

export function uid() {
  return crypto.randomUUID();
}

export function csvNum(value: number) {
  return value.toFixed(2).replace(".", ",");
}

export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";"))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
