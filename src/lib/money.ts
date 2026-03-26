export function normalizeMoneyInput(raw: unknown): string {
  const text = String(raw ?? "").trim();
  if (!text) return "";

  let v = text.replace(/\s/g, "");
  v = v.replace(/^R\$/i, "");
  v = v.replace(/R\$/gi, "");

  if (v.includes(",")) {
    v = v.replace(/\./g, "");
    v = v.replace(",", ".");
  } else {
    v = v.replace(/,/g, "");
  }

  return v;
}

export function toCentsDigits(raw: unknown): string {
  const normalized = normalizeMoneyInput(raw);
  if (!normalized) return "";
  const num = Number(normalized);
  if (Number.isNaN(num)) return "";
  const cents = Math.round(num * 100);
  return String(Math.max(0, cents));
}

export function formatCentsDigitsToBRL(digits: string): string {
  const only = (digits ?? "").replace(/\D/g, "");
  if (!only) return "";

  const padded = only.padStart(3, "0");
  const cents = padded.slice(-2);
  const intPart = padded.slice(0, -2).replace(/^0+(?=\d)/, "");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${grouped},${cents}`;
}

