import type { ReactNode } from "react";

export function PageHeader({
  kicker,
  title,
  lede,
  children,
}: {
  kicker: string;
  title: string;
  lede?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {children ? <div className="page-actions">{children}</div> : null}
    </header>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="ghost" onClick={onClose}>
            Fermer
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`pill tone-${tone}`}>{children}</span>;
}

export function Meter({ value, max }: { value: number; max: number }) {
  const ratio = max <= 0 ? 0 : value / max;
  return (
    <div className="meter" aria-hidden="true">
      <span className={ratio > 1 ? "over" : ""} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
    </div>
  );
}
