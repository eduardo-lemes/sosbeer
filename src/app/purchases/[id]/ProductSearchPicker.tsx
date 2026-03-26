"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Hit = { id: string; name: string; internalCode: string; eanGtin: string | null };

export function ProductSearchPicker({
  name,
  defaultProductId,
  defaultLabel,
  disabled,
  placeholder,
  compact,
}: {
  name: string;
  defaultProductId?: string | null;
  defaultLabel?: string | null;
  disabled?: boolean;
  placeholder?: string;
  compact?: boolean;
}) {
  const [value, setValue] = useState(defaultLabel ?? "");
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(
    defaultProductId ? { id: defaultProductId, label: defaultLabel ?? "" } : null,
  );
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const query = useMemo(() => value.trim(), [value]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const el = containerRef.current;
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

  useEffect(() => {
    if (!open) return;
    const q = query;
    if (!q) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setBusy(true);
      fetch(`/api/products/search?q=${encodeURIComponent(q)}&take=12`, { signal: ctrl.signal })
        .then(async (res) => (await res.json()) as { items: Hit[] })
        .then((data) => setHits(data.items ?? []))
        .catch(() => {})
        .finally(() => setBusy(false));
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
      setBusy(false);
    };
  }, [open, query]);

  function select(hit: Hit) {
    const label = `${hit.name} • ${hit.internalCode}`;
    setSelected({ id: hit.id, label });
    setValue(label);
    setOpen(false);
  }

  function clear() {
    setSelected(null);
    setValue("");
    setHits([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <div className="flex items-center gap-2">
        <input
          className={compact ? "input-compact" : "input"}
          placeholder={placeholder ?? "Buscar produto…"}
          value={value}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          title={value}
          onChange={(e) => {
            setSelected(null);
            const next = e.target.value;
            setValue(next);
            if (!next.trim()) setHits([]);
            setOpen(true);
          }}
        />
        {selected || value ? (
          <button
            type="button"
            className={compact ? "btn-icon btn-icon-sm" : "btn-inline"}
            onClick={clear}
            disabled={disabled}
            aria-label="Limpar"
            title="Limpar"
          >
            {compact ? <span className="text-base leading-none">×</span> : "Limpar"}
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          className={[
            "absolute left-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-xl",
            compact ? "w-[min(520px,calc(100vw-2rem))]" : "w-[min(560px,calc(100vw-2rem))]",
          ].join(" ")}
        >
          <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            {busy ? "Buscando..." : query ? `Resultados para “${query}”` : "Digite para buscar"}
          </div>
          <div className="max-h-72 overflow-auto p-1">
            {query && !busy && hits.length === 0 ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">Nenhum produto encontrado.</div>
            ) : null}
            {hits.map((h) => (
              <button
                key={h.id}
                type="button"
                className="flex w-full items-start justify-between gap-3 rounded-[var(--radius-md)] px-3 py-2 text-left transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                onClick={() => select(h)}
                title={`${h.name} • ${h.internalCode}${h.eanGtin ? ` • EAN: ${h.eanGtin}` : ""}`}
              >
                <div className="min-w-0">
                  <div className="clamp-2 text-sm font-semibold">{h.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Código: {h.internalCode}
                    {h.eanGtin ? ` • EAN: ${h.eanGtin}` : ""}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">Selecionar</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
