import Link from "next/link";
import { queryAll, type StockMovement, type Product } from "@/lib/db";
import { formatQty } from "@/lib/format";

export default async function MovementsPage() {
  const movements = await queryAll<StockMovement>("stockMovements", {
    orderBy: [["createdAt", "desc"]],
    limit: 200,
  });

  const productIds = [...new Set(movements.map((m) => m.productId))];
  const products: Product[] = [];
  for (let i = 0; i < productIds.length; i += 30) {
    const chunk = productIds.slice(i, i + 30);
    const found = await queryAll<Product>("products", { where: [["__name__", "in", chunk]] });
    products.push(...found);
  }
  const productMap = new Map(products.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Movimentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Últimas movimentações registradas.</p>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-xs text-primary">↔️</span>
            Histórico de movimentações
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{movements.length} movimento(s)</p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Produto</th>
              <th>Tipo</th>
              <th>Quantidade</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr><td className="px-4 py-6 text-muted-foreground" colSpan={5}>Sem movimentações ainda.</td></tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="text-muted-foreground">{m.createdAt.toLocaleString("pt-BR")}</td>
                  <td className="font-medium">{productMap.get(m.productId)?.name ?? "—"}</td>
                  <td>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      m.type === "ENTRY" ? "border-success/30 bg-success/10 text-success" :
                      m.type === "EXIT" ? "border-danger/30 bg-danger/10 text-danger" :
                      "border-accent/30 bg-accent/10 text-accent"
                    }`}>
                      {m.type === "ENTRY" ? "Entrada" : m.type === "EXIT" ? "Saída" : "Ajuste"}
                    </span>
                  </td>
                  <td className={m.delta < 0 ? "text-danger font-semibold" : "text-success font-semibold"}>
                    {formatSignedQty(m.type, m.delta, m.quantity)}
                  </td>
                  <td className="text-right">
                    <Link href={`/products/${m.productId}`} className="text-sm text-primary hover:underline">Ver produto</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function formatSignedQty(type: "ENTRY" | "EXIT" | "ADJUSTMENT", delta: number, quantity: number) {
  if (type === "ADJUSTMENT") {
    const sign = delta < 0 ? "-" : "+";
    return `${sign}${formatQty(Math.abs(delta))}`;
  }
  const sign = type === "EXIT" ? "-" : "+";
  return `${sign}${formatQty(quantity)}`;
}
