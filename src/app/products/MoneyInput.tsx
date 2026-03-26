"use client";

import { useId, useMemo, useState } from "react";
import { formatCentsDigitsToBRL, toCentsDigits } from "@/lib/money";

export function MoneyInput({
  name,
  label,
  defaultValue,
  required,
  placeholder,
  onValueChange,
  valueDigits,
  onDigitsChange,
  hideLabel,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
  onValueChange?: (value: number | null) => void;
  valueDigits?: string;
  onDigitsChange?: (digits: string) => void;
  hideLabel?: boolean;
}) {
  const id = useId();
  const initialDigits = useMemo(() => toCentsDigits(defaultValue), [defaultValue]);
  const [internalDigits, setInternalDigits] = useState(initialDigits);
  const digits = valueDigits ?? internalDigits;
  const setDigits = onDigitsChange ?? setInternalDigits;

  const display = formatCentsDigitsToBRL(digits);

  return (
    <label className="block" htmlFor={id}>
      {!hideLabel ? <div className="mb-1 text-sm font-medium">{label}</div> : null}
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 inline-flex items-center pl-3 text-sm text-muted-foreground">
          R$
        </span>
        <input
          id={id}
          name={name}
          aria-label={hideLabel ? label : undefined}
          value={display}
          onChange={(e) => {
            const nextDigits = e.target.value.replace(/\D/g, "");
            setDigits(nextDigits);
            if (onValueChange) {
              if (!nextDigits) onValueChange(null);
              else onValueChange(Number(nextDigits) / 100);
            }
          }}
          className="input pl-10"
          inputMode="numeric"
          placeholder={placeholder ?? "0,00"}
          required={required}
          autoComplete="off"
        />
      </div>
    </label>
  );
}
