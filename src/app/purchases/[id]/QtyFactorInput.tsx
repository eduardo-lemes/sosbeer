"use client";

import { useEffect, useMemo, useState } from "react";

type Preset = { key: string; label: string; factor: number };
type DivPreset = { key: string; label: string; divisor: number };

const PRESETS: Preset[] = [
  { key: "UN", label: "Unidade", factor: 1 },
  { key: "DZ", label: "Dúzia", factor: 12 },
  { key: "CX", label: "Centena", factor: 100 },
  { key: "MIL", label: "Milheiro", factor: 1000 },
  { key: "OUTRO", label: "Outro", factor: 1 },
];

const DIV_PRESETS: DivPreset[] = [
  { key: "1", label: "Estoque: 1", divisor: 1 },
  { key: "20", label: "Maço (20)", divisor: 20 },
  { key: "10", label: "Cartela (10)", divisor: 10 },
  { key: "12", label: "Dúzia (12)", divisor: 12 },
  { key: "OUTRO", label: "Outro", divisor: 1 },
];

export function QtyFactorInput({
  name,
  divisorName,
  qty,
  defaultFactor,
  defaultDivisor = 1,
  disabled,
  onChange,
}: {
  name: string; // multiplier_{idx}
  divisorName: string; // divisor_{idx}
  qty: string;
  defaultFactor: number;
  defaultDivisor?: number;
  disabled?: boolean;
  onChange?: (next: { multiplier: number; divisor: number; entry: number }) => void;
}) {
  const [presetKey, setPresetKey] = useState<string>(() => {
    const found = PRESETS.find((p) => p.factor === defaultFactor);
    return found ? found.key : "OUTRO";
  });
  const [factor, setFactor] = useState<string>(() => String(defaultFactor));

  const [divPresetKey, setDivPresetKey] = useState<string>(() => {
    const found = DIV_PRESETS.find((p) => p.divisor === defaultDivisor);
    return found ? found.key : "OUTRO";
  });
  const [divisor, setDivisor] = useState<string>(() => String(defaultDivisor));

  const qtyNum = useMemo(() => {
    const raw = String(qty ?? "").trim().replace(",", ".");
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }, [qty]);

  const factorInt = useMemo(() => {
    const only = factor.replace(/[^\d]/g, "");
    const n = Number(only || "1");
    if (!Number.isFinite(n) || n <= 0) return 1;
    return Math.max(1, Math.min(999_999, n));
  }, [factor]);

  const divisorInt = useMemo(() => {
    const only = divisor.replace(/[^\d]/g, "");
    const n = Number(only || "1");
    if (!Number.isFinite(n) || n <= 0) return 1;
    return Math.max(1, Math.min(999_999, n));
  }, [divisor]);

  const entry = useMemo(() => {
    const total = (qtyNum * factorInt) / divisorInt;
    return Number.isFinite(total) ? total : 0;
  }, [qtyNum, factorInt, divisorInt]);

  // Notifica o pai (ex: para recalcular custo sugerido) sem depender do formulário.
  useEffect(() => {
    onChange?.({ multiplier: factorInt, divisor: divisorInt, entry });
  }, [onChange, factorInt, divisorInt, entry]);

  return (
    <div className="flex flex-col gap-1">
      <input type="hidden" name={name} value={String(factorInt)} />
      <input type="hidden" name={divisorName} value={String(divisorInt)} />
      <div className="flex items-center justify-center gap-3 whitespace-nowrap">
        <select
          className="select-compact w-40 shrink-0"
          value={presetKey}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value;
            setPresetKey(next);
            const preset = PRESETS.find((p) => p.key === next);
            if (preset && preset.key !== "OUTRO") setFactor(String(preset.factor));
          }}
        >
          {PRESETS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>

        {presetKey === "OUTRO" ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-muted-foreground">×</span>
            <input
              className="input-compact w-20 shrink-0 text-center"
              inputMode="numeric"
              value={factor}
              disabled={disabled}
              onChange={(e) => {
                setPresetKey("OUTRO");
                setFactor(e.target.value.replace(/[^\d]/g, ""));
              }}
              title="Multiplicador (embalagem)"
              aria-label="Multiplicador"
            />
          </div>
        ) : (
          <div className="w-12 shrink-0 text-center text-xs text-muted-foreground" title={`Multiplicador: ${factorInt}`}>
            ×{factorInt}
          </div>
        )}

        <div className="flex items-center gap-2">
          <select
            className="select-compact w-40 shrink-0"
            value={divPresetKey}
            disabled={disabled}
            onChange={(e) => {
              const next = e.target.value;
              setDivPresetKey(next);
              const preset = DIV_PRESETS.find((p) => p.key === next);
              if (preset && preset.key !== "OUTRO") setDivisor(String(preset.divisor));
            }}
            title="Unidade do seu estoque (divisor)"
            aria-label="Unidade do estoque"
          >
            {DIV_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>

          {divPresetKey === "OUTRO" ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-muted-foreground">÷</span>
              <input
                className="input-compact w-20 shrink-0 text-center"
                inputMode="numeric"
                value={divisor}
                disabled={disabled}
                onChange={(e) => {
                  setDivPresetKey("OUTRO");
                  setDivisor(e.target.value.replace(/[^\d]/g, ""));
                }}
                title="Divisor (quantidade por unidade do seu estoque)"
                aria-label="Divisor"
              />
            </div>
          ) : (
            <div className="w-12 shrink-0 text-center text-xs text-muted-foreground" title={`Divisor: ${divisorInt}`}>
              ÷{divisorInt}
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">Entrada: {entry.toLocaleString("pt-BR")}</div>
    </div>
  );
}
