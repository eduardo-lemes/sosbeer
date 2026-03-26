"use client";

import { useMemo, useState } from "react";
import { formatCentsDigitsToBRL, toCentsDigits } from "@/lib/money";

export function CostInput({
  centsName,
  defaultValue,
  disabled,
}: {
  centsName: string;
  defaultValue: string;
  disabled?: boolean;
}) {
  const suggestedDigits = useMemo(() => toCentsDigits(defaultValue), [defaultValue]);
  const [manualDigits, setManualDigits] = useState<string | null>(null);
  const digits = manualDigits === null ? suggestedDigits : manualDigits;

  const suggested = useMemo(() => {
    const v = formatCentsDigitsToBRL(suggestedDigits);
    return v ? `R$ ${v}` : "";
  }, [suggestedDigits]);

  return (
    <div className="flex flex-col gap-1">
      <input type="hidden" name={centsName} value={digits} />
      <div className="flex flex-col items-center gap-1">
        <div className="text-xs font-semibold text-muted-foreground">R$</div>
        <input
          className="input-compact w-24 text-center"
          inputMode="numeric"
          placeholder="0,00"
          value={formatCentsDigitsToBRL(digits)}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "");
            setManualDigits(next === "" ? "" : next);
          }}
        />
      </div>
      {suggested ? <div className="text-xs text-muted-foreground">Sug.: {suggested}</div> : null}
    </div>
  );
}
