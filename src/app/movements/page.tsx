import Link from "next/link";
import { queryAll, getById, type StockMovement, type Product } from "@/lib/db";
import { formatQty } from "@/lib/format";

export default async function MovementsPage() {
  const movements = await queryAll<StockMovement>("stockMovements", {
    orderBy: [["createdAt", "desc"]],
    limit: 200,
  });

  // Hydrate product names
  const productIds = [...new Set(movements.map((m) => m.productId))];
  const products: Product[] = [];
  for (let i = 0; i < productIds.length; i += 30) {
    const chunk = productIds.slice(i, i + 30);
    const found = await queryAll<Product>("products", { where: [["__name__", "in", chunk]] });
    products.push(...found);
  }
  const productMap = new Map(products.map((p) => [p.id, p]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Movimentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Últimas movimentações registradas.</p>
      </div>

      <div className="card overflow-hidden">
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
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                  Sem movimentações ainda.
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="text-muted-foreground">{m.createdAt.toLocaleString("pt-BR")}</td>
                  <td className="font-medium">{productMap.get(m.productId)?.name ?? "—"}</td>
                  <td>
                    {m.type === "ENTRY" ? "Entrada" : m.type === "EXIT" ? "Saída" : "Ajuste"}
                  </td>
                  <td className={m.delta < 0 ? "text-danger" : "text-success"}>
                    {formatSignedQty(m.type, m.delta, m.quantity)}
                  </td>
                  <td className="text-right">
                    <Link href={`/products/${m.productId}`} className="text-sm text-primary hover:underline">
                      Ver produto
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatSignedQty(
  type: "ENTRY" | "EXIT" | "ADJUSTMENT",
  delta: number,
  quantity: number,
) {
  if (type === "ADJUSTMENT") {
    const sign = delta < 0 ? "-" : "+";
    return `${sign}${formatQty(Math.abs(delta))}`;
  }
  const sign = type === "EXIT" ? "-" : "+";
  return `${sign}${formatQty(quantity)}`;
}
