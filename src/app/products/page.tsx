import Link from "next/link";
import { queryAll, getStockByProductIds, type Product, type Category, type Subcategory, type Brand } from "@/lib/db";
import { formatMoney, formatQty } from "@/lib/format";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  let products: (Product & { category?: Category | null; subcategory?: Subcategory | null; brand?: Brand | null })[];

  if (query) {
    const all = await queryAll<Product>("products", { orderBy: [["updatedAt", "desc"]], limit: 500 });
    const lower = query.toLowerCase();
    products = all.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.internalCode.toLowerCase().includes(lower) ||
        (p.eanGtin && p.eanGtin.toLowerCase().includes(lower)),
    ).slice(0, 200);
  } else {
    products = await queryAll<Product>("products", { orderBy: [["updatedAt", "desc"]], limit: 200 });
  }

  const categoryIds = [...new Set(products.map((p) => p.categoryId).filter(Boolean))] as string[];
  const brandIds = [...new Set(products.map((p) => p.brandId).filter(Boolean))] as string[];
  const subcategoryIds = [...new Set(products.map((p) => p.subcategoryId).filter(Boolean))] as string[];

  const [categories, brands, subcategories] = await Promise.all([
    categoryIds.length ? queryAll<Category>("categories", { where: [["__name__", "in", categoryIds.slice(0, 30)]] }) : [],
    brandIds.length ? queryAll<Brand>("brands", { where: [["__name__", "in", brandIds.slice(0, 30)]] }) : [],
    subcategoryIds.length ? queryAll<Subcategory>("subcategories", { where: [["__name__", "in", subcategoryIds.slice(0, 30)]] }) : [],
  ]);

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const brandMap = new Map(brands.map((b) => [b.id, b]));
  const subMap = new Map(subcategories.map((s) => [s.id, s]));

  const enriched = products.map((p) => ({
    ...p,
    category: p.categoryId ? catMap.get(p.categoryId) ?? null : null,
    subcategory: p.subcategoryId ? subMap.get(p.subcategoryId) ?? null : null,
    brand: p.brandId ? brandMap.get(p.brandId) ?? null : null,
  }));

  const stockByProductId = await getStockByProductIds(products.map((p) => p.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cadastre e edite produtos do catálogo.</p>
        </div>
        <Link href="/products/new" className="btn-primary">Novo produto</Link>
      </div>

      {/* ── Busca ── */}
      <section className="card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-xs text-primary">🔍</span>
            Buscar
          </h2>
        </div>
        <form className="p-5">
          <div className="flex items-center gap-3">
            <input name="q" defaultValue={query} placeholder="Buscar por nome, código ou EAN…" className="input" />
            <button className="btn-ghost">Buscar</button>
          </div>
        </form>
      </section>

      {/* ── Tabela ── */}
      <section className="card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-xs text-accent">📦</span>
            Lista de produtos
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{enriched.length} produto(s) encontrado(s)</p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Código</th>
              <th>EAN</th>
              <th className="hidden lg:table-cell">Categoria</th>
              <th className="hidden lg:table-cell">Marca</th>
              <th className="hidden md:table-cell">Preço</th>
              <th className="hidden md:table-cell">Estoque</th>
              <th className="hidden lg:table-cell">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {enriched.length === 0 ? (
              <tr><td className="px-4 py-6 text-muted-foreground" colSpan={9}>Nenhum produto encontrado.</td></tr>
            ) : (
              enriched.map((p) => {
                const stock = p.trackStock ? (stockByProductId.get(p.id) ?? 0) : null;
                const stockTone =
                  stock == null ? "text-muted-foreground" : stock <= 0 ? "text-danger" : stock <= 3 ? "text-accent" : "text-muted-foreground";
                const statusLabel = p.active ? "Ativo" : "Inativo";
                const statusTone = p.active ? "text-success" : "text-muted-foreground";

                return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="min-w-[280px] font-semibold">{p.name}</td>
                    <td className="whitespace-nowrap">{p.internalCode}</td>
                    <td className="whitespace-nowrap text-muted-foreground">{p.eanGtin ?? "-"}</td>
                    <td className="hidden lg:table-cell">
                      <div className="text-muted-foreground">{p.category?.name ?? "—"}</div>
                      {p.subcategory?.name ? (
                        <div className="mt-0.5 text-xs text-muted-foreground/80">{p.subcategory.name}</div>
                      ) : null}
                    </td>
                    <td className="hidden lg:table-cell text-muted-foreground">{p.brand?.name ?? "—"}</td>
                    <td className="hidden md:table-cell whitespace-nowrap font-semibold">{formatMoney(p.salePrice)}</td>
                    <td className={`hidden md:table-cell whitespace-nowrap font-semibold ${stockTone}`}>
                      {stock == null ? "—" : formatQty(stock)}
                      {stock == null ? null : <span className="ml-2 text-xs font-medium text-muted-foreground">un</span>}
                    </td>
                    <td className={`hidden lg:table-cell whitespace-nowrap font-semibold ${statusTone}`}>{statusLabel}</td>
                    <td className="whitespace-nowrap text-right">
                      <Link href={`/products/${p.id}`} className="text-sm text-primary hover:underline">Editar</Link>
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
