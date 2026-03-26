import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { queryAll, getById, type Sale, type SaleItem, type SalePayment, type Product } from "@/lib/db";
import { formatMoney, formatQty } from "@/lib/format";

export async function RecentSales() {
  noStore();

  const since = new Date();
  since.setHours(since.getHours() - 48);

  const sales = await queryAll<Sale>("sales", {
    where: [["createdAt", ">=", since]],
    orderBy: [["createdAt", "desc"]],
    limit: 50,
  });

  // Hydrate items and payments
  const salesWithDetails = await Promise.all(
    sales.map(async (s) => {
      const items = await queryAll<SaleItem>("saleItems", { where: [["saleId", "==", s.id]] });
      const payments = await queryAll<SalePayment>("salePayments", { where: [["saleId", "==", s.id]] });

      // Get product names for items
      const productIds = [...new Set(items.map((i) => i.productId))];
      const products: Product[] = [];
      for (let i = 0; i < productIds.length; i += 30) {
        const chunk = productIds.slice(i, i + 30);
        const found = await queryAll<Product>("products", { where: [["__name__", "in", chunk]] });
        products.push(...found);
      }
      const productMap = new Map(products.map((p) => [p.id, p]));

      return {
        ...s,
        items: items.map((it) => ({ ...it, product: productMap.get(it.productId) ?? { name: "—" } })),
        payments,
      };
    }),
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-4">
        <div>
          <div className="text-sm font-semibold">Últimas vendas</div>
          <div className="mt-1 text-xs text-muted-foreground">Últimas 48 horas • {salesWithDetails.length} venda(s)</div>
        </div>
        <Link href="/sales" className="btn-ghost">Ver todas</Link>
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Hora</th>
              <th>Itens</th>
              <th>Total</th>
              <th>Pagamento</th>
              <th className="text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {salesWithDetails.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                  Sem vendas nas últimas 48 horas.
                </td>
              </tr>
            ) : (
              salesWithDetails.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="font-medium">{s.number}</td>
                  <td className="text-muted-foreground">
                    {s.createdAt.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="text-muted-foreground">
                    {s.items.length === 0 ? (
                      "-"
                    ) : (
                      <div className="max-w-[520px] space-y-0.5">
                        {s.items.slice(0, 2).map((it) => (
                          <div key={it.id} className="truncate">
                            {formatQty(it.quantity)}x {it.product.name}
                          </div>
                        ))}
                        {s.items.length > 2 ? (
                          <div className="text-xs text-muted-foreground">+{s.items.length - 2} item(ns)</div>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="font-semibold">{formatMoney(s.total)}</td>
                  <td className="text-muted-foreground">
                    {s.payments.map((p) => paymentLabel(p.method)).join(" + ") || "-"}
                  </td>
                  <td className="text-right">
                    <Link href={`/sales/${s.id}`} className="btn-inline">Abrir</Link>
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

function paymentLabel(method: string) {
  if (method === "CASH") return "Dinheiro";
  if (method === "PIX") return "Pix";
  if (method === "DEBIT") return "Débito";
  if (method === "CREDIT") return "Crédito";
  return method;
}
