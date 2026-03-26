"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export function CatalogPicker({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalizeKey(query);
    if (!q) return options;
    return options.filter((o) => normalizeKey(o).includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        className={`select flex items-center justify-between gap-3 ${disabled ? "opacity-60" : ""}`}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => {
            const next = !v;
            if (!next) setQuery("");
            return next;
          });
        }}
      >
        <span className={value.trim() ? "" : "text-muted-foreground"}>{value.trim() ? value : placeholder}</span>
        <span className="text-muted-foreground">▾</span>
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(520px,100%)] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-xl">
          <div className="border-b border-border bg-muted/30 p-3">
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setOpen(false);
                  setQuery("");
                  return;
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  const first = filtered[0];
                  if (first) {
                    onChange(first);
                    setOpen(false);
                    setQuery("");
                  }
                }
              }}
            />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <div>{options.length} opção(ões)</div>
              <button
                type="button"
                className="btn-inline"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setQuery("");
                }}
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">Nada encontrado.</div>
            ) : (
              filtered.map((o) => {
                const active = normalizeKey(o) === normalizeKey(value);
                return (
                  <button
                    key={o}
                    type="button"
                    className={`w-full rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm transition hover:bg-muted ${active ? "bg-muted" : ""}`}
                    onClick={() => {
                      onChange(o);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <div className="font-semibold">{o}</div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function normalizeKey(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

