import Link from "next/link";
import { queryAll, getStockByProductIds, type Product } from "@/lib/db";
import { formatQty } from "@/lib/format";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; belowMin?: string; zero?: string; inactive?: string }>;
}) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim();
  const belowMin = sp.belowMin === "1";
  const zero = sp.zero === "1";
  const includeInactive = sp.inactive === "1";

  let where: [string, FirebaseFirestore.WhereFilterOp, unknown][] = [["trackStock", "==", true]];
  if (!includeInactive) where.push(["active", "==", true]);

  let products = await queryAll<Product>("products", {
    where,
    orderBy: [["name", "asc"]],
    limit: 500,
  });

  if (query) {
    const lower = query.toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.internalCode.toLowerCase().includes(lower) ||
        (p.eanGtin && p.eanGtin.toLowerCase().includes(lower)),
    );
  }

  const stockMap = await getStockByProductIds(products.map((p) => p.id));
  const rows = products
    .map((p) => {
      const stock = stockMap.get(p.id) ?? 0;
      return { product: p, stock };
    })
    .filter(({ product, stock }) => {
      if (zero && stock !== 0) return false;
      if (belowMin) {
        const min = product.stockMin;
        if (!min) return false;
        if (stock >= min) return false;
      }
      return true;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Estoque</h1>
          <p className="mt-1 text-sm text-muted-foreground">Posição atual baseada nas movimentações.</p>
        </div>
        <Link href="/purchases" className="btn-primary">Importar compra (XML)</Link>
      </div>

      {/* ── Filtros ── */}
      <section className="card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-xs text-primary">🔍</span>
            Filtros
          </h2>
        </div>
        <form className="p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block">
                <div className="mb-1 text-sm font-medium">Buscar</div>
                <input name="q" defaultValue={query} placeholder="Nome, código ou EAN…" className="input" />
              </label>
            </div>
            <div className="flex items-end gap-3 sm:col-span-2">
              <label className="toggle toggle-sm">
                <input type="checkbox" name="belowMin" value="1" defaultChecked={belowMin} className="sr-only peer" />
                <span className="toggle-track peer-checked:border-primary/40 peer-checked:bg-primary"><span className="toggle-thumb peer-checked:translate-x-5" /></span>
                <span>Abaixo do mínimo</span>
              </label>
              <label className="toggle toggle-sm">
                <input type="checkbox" name="zero" value="1" defaultChecked={zero} className="sr-only peer" />
                <span className="toggle-track peer-checked:border-primary/40 peer-checked:bg-primary"><span className="toggle-thumb peer-checked:translate-x-5" /></span>
                <span>Sem saldo</span>
              </label>
              <label className="toggle toggle-sm">
                <input type="checkbox" name="inactive" value="1" defaultChecked={includeInactive} className="sr-only peer" />
                <span className="toggle-track peer-checked:border-primary/40 peer-checked:bg-primary"><span className="toggle-thumb peer-checked:translate-x-5" /></span>
                <span>Incluir inativos</span>
              </label>
              <button className="btn-ghost ml-auto">Aplicar</button>
            </div>
          </div>
        </form>
      </section>

      {/* ── Tabela ── */}
      <section className="card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-success/15 text-xs text-success">📊</span>
            Posição de estoque
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{rows.length} produto(s) encontrado(s)</p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Código</th>
              <th>Saldo</th>
              <th>Mín</th>
              <th>Máx</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="px-4 py-6 text-muted-foreground" colSpan={7}>Nenhum item com esses filtros.</td></tr>
            ) : (
              rows.map(({ product: p, stock }) => {
                const status = getStockStatus(p.active, stock, p.stockMin, p.stockMax);
                return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="font-medium">{p.name}</td>
                    <td>{p.internalCode}</td>
                    <td>{formatQty(stock)}</td>
                    <td className="text-muted-foreground">{p.stockMin ? formatQty(p.stockMin) : "-"}</td>
                    <td className="text-muted-foreground">{p.stockMax ? formatQty(p.stockMax) : "-"}</td>
                    <td><StatusBadge status={status} /></td>
                    <td className="text-right">
                      <Link href={`/products/${p.id}/move`} className="text-sm text-primary hover:underline">Movimentar</Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

type StockStatus = "INACTIVE" | "LOW" | "ZERO" | "HIGH" | "OK";

function getStockStatus(active: boolean, stock: number, min: number | null, max: number | null): StockStatus {
  if (!active) return "INACTIVE";
  if (stock === 0) return "ZERO";
  if (min && stock < min) return "LOW";
  if (max && stock > max) return "HIGH";
  return "OK";
}

function StatusBadge({ status }: { status: StockStatus }) {
  const cfg: Record<StockStatus, { label: string; className: string }> = {
    INACTIVE: { label: "Inativo", className: "border-border bg-muted text-muted-foreground" },
    ZERO: { label: "Sem saldo", className: "border-border bg-muted text-muted-foreground" },
    LOW: { label: "Baixo", className: "border-danger/30 bg-danger/10 text-danger" },
    HIGH: { label: "Alto", className: "border-primary/30 bg-primary/10 text-primary" },
    OK: { label: "OK", className: "border-success/30 bg-success/10 text-success" },
  };
  const { label, className } = cfg[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
