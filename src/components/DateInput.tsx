"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function toDisplay(iso: string): string {
  // iso: yyyy-mm-dd -> dd/mm/yyyy
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function toISO(display: string): string {
  // display: dd/mm/yyyy -> yyyy-mm-dd (if valid)
  const digits = display.replace(/[^\d]/g, "").slice(0, 8);
  if (digits.length !== 8) return "";
  const dd = Number(digits.slice(0, 2));
  const mm = Number(digits.slice(2, 4));
  const yyyy = Number(digits.slice(4, 8));
  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return "";
  if (yyyy < 1900 || yyyy > 2100) return "";
  if (mm < 1 || mm > 12) return "";
  if (dd < 1 || dd > 31) return "";
  const date = new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0, 0));
  if (date.getUTCFullYear() !== yyyy || date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd) return "";
  const y = String(yyyy).padStart(4, "0");
  const m = String(mm).padStart(2, "0");
  const d = String(dd).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDigitsToDisplay(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "").slice(0, 8);
  const p1 = digits.slice(0, 2);
  const p2 = digits.slice(2, 4);
  const p3 = digits.slice(4, 8);
  if (digits.length <= 2) return p1;
  if (digits.length <= 4) return `${p1}/${p2}`;
  return `${p1}/${p2}/${p3}`;
}

function startOfMonthUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function addMonthsUTC(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 0, 0, 0, 0));
}

function isoFromUTCDate(date: Date) {
  const y = String(date.getUTCFullYear()).padStart(4, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DateInput({
  name,
  label,
  required,
  disabled,
  defaultValueISO,
  compact,
  className,
}: {
  name: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  defaultValueISO?: string;
  compact?: boolean;
  className?: string;
}) {
  const initial = useMemo(() => (defaultValueISO ? toDisplay(defaultValueISO) : ""), [defaultValueISO]);
  const [display, setDisplay] = useState(initial);
  const isoValue = useMemo(() => toISO(display), [display]);
  const inputClass = compact ? "input-compact" : "input";
  const iconBtnClass = compact ? "btn-icon btn-icon-sm" : "btn-icon";
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const selectedDateUTC = useMemo(() => {
    if (!isoValue) return null;
    const m = isoValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const yyyy = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    const dt = new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0, 0));
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  }, [isoValue]);

  const [viewMonthUTC, setViewMonthUTC] = useState<Date>(() => {
    const base = selectedDateUTC ?? new Date();
    const baseUTC = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0));
    return startOfMonthUTC(baseUTC);
  });

  useEffect(() => {
    if (!open) return;
    // Sempre que abrir, sincroniza com o mês do valor selecionado (ou hoje).
    const base = selectedDateUTC ?? new Date();
    const baseUTC = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0));
    setViewMonthUTC(startOfMonthUTC(baseUTC));
  }, [open, selectedDateUTC]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const el = popoverRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const monthLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
    return fmt.format(viewMonthUTC);
  }, [viewMonthUTC]);

  const todayUTC = useMemo(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
  }, []);

  const grid = useMemo(() => {
    const y = viewMonthUTC.getUTCFullYear();
    const m = viewMonthUTC.getUTCMonth();
    const first = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    const offset = first.getUTCDay(); // 0=Dom..6=Sáb
    const cells: Array<{ dateUTC: Date; inMonth: boolean }> = [];

    for (let i = 0; i < 42; i++) {
      const day = i - offset + 1;
      const d = new Date(Date.UTC(y, m, day, 0, 0, 0, 0));
      const inMonth = d.getUTCMonth() === m;
      cells.push({ dateUTC: d, inMonth });
    }
    // Se a 6ª semana for toda fora do mês, remove (fica 35).
    const lastWeek = cells.slice(35);
    const hasAnyInMonth = lastWeek.some((c) => c.inMonth);
    return hasAnyInMonth ? cells : cells.slice(0, 35);
  }, [viewMonthUTC]);

  function selectDate(dateUTC: Date) {
    if (disabled) return;
    setDisplay(toDisplay(isoFromUTCDate(dateUTC)));
    setOpen(false);
  }

  return (
    <label className={className}>
      <div className="mb-1 text-sm font-medium">{label}{required ? " *" : ""}</div>
      <input type="hidden" name={name} value={isoValue} disabled={disabled} />
      <div ref={popoverRef} className="relative flex items-center gap-2">
        <input
          className={`${inputClass} w-40`}
          placeholder="dd/mm/aaaa"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          value={display}
          onChange={(e) => setDisplay(formatDigitsToDisplay(e.target.value))}
        />
        <button
          type="button"
          className={iconBtnClass}
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
          aria-label="Abrir calendário"
          title="Abrir calendário"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
            <path
              d="M8 3v2m8-2v2M4.5 9.5h15M6.5 5h11A2.5 2.5 0 0 1 20 7.5v12A2.5 2.5 0 0 1 17.5 22h-11A2.5 2.5 0 0 1 4 19.5v-12A2.5 2.5 0 0 1 6.5 5Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {open ? (
          <div className="datepicker-popover">
            <div className="datepicker-header">
              <button
                type="button"
                className="btn-icon btn-icon-sm"
                onClick={() => setViewMonthUTC((d) => addMonthsUTC(d, -1))}
                aria-label="Mês anterior"
                title="Mês anterior"
              >
                ‹
              </button>
              <div className="datepicker-title">{monthLabel}</div>
              <button
                type="button"
                className="btn-icon btn-icon-sm"
                onClick={() => setViewMonthUTC((d) => addMonthsUTC(d, 1))}
                aria-label="Próximo mês"
                title="Próximo mês"
              >
                ›
              </button>
            </div>

            <div className="datepicker-weekdays">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((d) => (
                <div key={d} className="datepicker-weekday">
                  {d}
                </div>
              ))}
            </div>

            <div className="datepicker-grid">
              {grid.map(({ dateUTC, inMonth }) => {
                const isToday = isoFromUTCDate(dateUTC) === isoFromUTCDate(todayUTC);
                const isSelected = selectedDateUTC ? isoFromUTCDate(dateUTC) === isoFromUTCDate(selectedDateUTC) : false;
                return (
                  <button
                    key={dateUTC.toISOString()}
                    type="button"
                    className={[
                      "datepicker-day",
                      inMonth ? "" : "datepicker-day-out",
                      isToday ? "datepicker-day-today" : "",
                      isSelected ? "datepicker-day-selected" : "",
                    ].join(" ")}
                    onClick={() => selectDate(dateUTC)}
                  >
                    {dateUTC.getUTCDate()}
                  </button>
                );
              })}
            </div>

            <div className="datepicker-actions">
              <button
                type="button"
                className="btn-ghost btn-ghost-sm"
                onClick={() => {
                  setDisplay("");
                  setOpen(false);
                }}
              >
                Limpar
              </button>
              <button type="button" className="btn-primary btn-primary-sm" onClick={() => selectDate(todayUTC)}>
                Hoje
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {required && !disabled && display && !isoValue ? (
        <div className="mt-1 text-xs text-muted-foreground">Data inválida.</div>
      ) : null}
    </label>
  );
}
