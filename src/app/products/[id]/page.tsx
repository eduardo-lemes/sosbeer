import Link from "next/link";
import { notFound } from "next/navigation";
import { getById, queryAll, getCurrentStock, type Product, type Category, type Subcategory, type Brand, type Unit, type StockMovement } from "@/lib/db";
import { ProductForm } from "../ProductForm";
import { updateProduct } from "../actions";
import { formatQty } from "@/lib/format";
import { ProductTabs } from "./ProductTabs";
import { DateInput } from "@/components/DateInput";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; from?: string; to?: string; type?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const product = await getById<Product>("products", id);
  if (!product) notFound();

  const [pCategory, pSubcategory, pBrand, pUnit] = await Promise.all([
    product.categoryId ? getById<Category>("categories", product.categoryId) : null,
    product.subcategoryId ? getById<Subcategory>("subcategories", product.subcategoryId) : null,
    product.brandId ? getById<Brand>("brands", product.brandId) : null,
    product.unitId ? getById<Unit>("units", product.unitId) : null,
  ]);

  const action = updateProduct.bind(null, product.id);
  const tab = sp.tab === "movements" ? "movements" : "details";

  const categories = await queryAll<Category>("categories", { orderBy: [["name", "asc"]] });
  const subcategories = await queryAll<Subcategory>("subcategories", { orderBy: [["name", "asc"]] });
  const brands = await queryAll<Brand>("brands", { orderBy: [["name", "asc"]] });
  const units = await queryAll<Unit>("units", { orderBy: [["name", "asc"]] });
  const categorySuggestions = categories.map((c) => c.name);
  const subcategorySuggestionsByCategory: Record<string, string[]> = {};
  for (const c of categories) {
    subcategorySuggestionsByCategory[c.name.trim().toLocaleLowerCase("pt-BR")] = subcategories
      .filter((s) => s.categoryId === c.id)
      .map((s) => s.name);
  }

  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  const from = parseDateStart(sp.from) ?? startOfDayUTC(defaultFrom);
  const to = parseDateEnd(sp.to) ?? endOfDayUTC(today);
  const type = normalizeMovementType(sp.type);

  const currentStock = await getCurrentStock(product.id);

  let movementsQuery: [string, FirebaseFirestore.WhereFilterOp, unknown][] = [
    ["productId", "==", product.id],
    ["createdAt", ">=", from],
    ["createdAt", "<=", to],
  ];
  if (type) movementsQuery.push(["type", "==", type]);

  const movements = await queryAll<StockMovement>("stockMovements", {
    where: movementsQuery,
    orderBy: [["createdAt", "desc"]],
    limit: 200,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Editar produto</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {product.name} • {product.internalCode}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/products/${product.id}/move`} className="btn-ghost">
            Movimentar estoque
          </Link>
          <Link href="/products" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            Voltar
          </Link>
        </div>
      </div>

      <ProductTabs
        initialTab={tab}
        details={
          <div className="card p-5">
            <ProductForm
              submitLabel="Salvar"
              action={action}
              currentStock={currentStock.toString()}
              categorySuggestions={categorySuggestions}
              subcategorySuggestionsByCategory={subcategorySuggestionsByCategory}
              brandSuggestions={brands.map((b) => b.name)}
              unitSuggestions={units.map((u) => u.name)}
              initial={{
                name: product.name,
                internalCode: product.internalCode,
                eanGtin: product.eanGtin,
                salePrice: product.salePrice.toString(),
                costPrice: product.costPrice?.toString() ?? "",
                categoryName: pCategory?.name ?? "",
                subcategoryName: pSubcategory?.name ?? "",
                brandName: pBrand?.name ?? "",
                unitName: pUnit?.name ?? "",
                imageUrl: product.imageUrl ?? "",
                trackStock: product.trackStock,
                stockMin: product.stockMin?.toString() ?? "",
                stockMax: product.stockMax?.toString() ?? "",
                location: product.location ?? "",
                notes: product.notes ?? "",
                active: product.active,
              }}
            />
          </div>
        }
        movements={
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border bg-muted/30 px-5 py-4">
              <div>
                <div className="text-sm font-semibold">Movimentos do produto</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Últimos {Math.min(200, movements.length)} (período filtrado)
                </div>
              </div>

              <form className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="tab" value="movements" />
                <DateInput name="from" label="De" defaultValueISO={formatDateInput(from)} compact className="block" />
                <DateInput name="to" label="Até" defaultValueISO={formatDateInput(to)} compact className="block" />
                <label className="block">
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Tipo</div>
                  <select name="type" defaultValue={type ?? ""} className="select h-9 py-1.5">
                    <option value="">Todos</option>
                    <option value="ENTRY">Entrada</option>
                    <option value="EXIT">Saída</option>
                    <option value="ADJUSTMENT">Ajuste</option>
                  </select>
                </label>
                <button className="btn-ghost h-9 px-3 py-1.5">Aplicar</button>
              </form>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Tipo</th>
                  <th>Quantidade</th>
                  <th>Obs.</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                      Sem movimentos nesse período.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="border-t border-border">
                      <td className="text-muted-foreground">{m.createdAt.toLocaleString("pt-BR")}</td>
                      <td>
                        {m.type === "ENTRY" ? "Entrada" : m.type === "EXIT" ? "Saída" : "Ajuste"}
                      </td>
                      <td className={m.delta < 0 ? "text-danger" : "text-success"}>
                        {m.type === "ADJUSTMENT"
                          ? `${m.delta < 0 ? "-" : "+"}${formatQty(Math.abs(m.delta))}`
                          : `${m.type === "EXIT" ? "-" : "+"}${formatQty(m.quantity)}`}
                      </td>
                      <td className="text-muted-foreground">{m.note ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        }
      />
    </div>
  );
}

function normalizeMovementType(value?: string): "ENTRY" | "EXIT" | "ADJUSTMENT" | null {
  if (value === "ENTRY" || value === "EXIT" || value === "ADJUSTMENT") return value;
  return null;
}

function startOfDayUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfDayUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function parseDateStart(value?: string) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function parseDateEnd(value?: string) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T23:59:59.999Z`);
}

function formatDateInput(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
