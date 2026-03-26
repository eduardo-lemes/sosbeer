export function formatMoney(value: number | string): string {
  const amount = typeof value === "string" ? Number(value) : Number(value);
  if (Number.isNaN(amount)) return "R$0,00";
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatQty(value: number | string): string {
  const amount = typeof value === "string" ? Number(value) : Number(value);
  if (Number.isNaN(amount)) return "0";
  return amount.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}
