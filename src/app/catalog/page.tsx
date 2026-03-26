import { queryAll, type Category, type Subcategory, type Brand, type Unit } from "@/lib/db";
import { CreateBrandForm, CreateCategoryForm, CreateSubcategoryForm, CreateUnitForm } from "./CatalogForms";
import { DeleteCatalogButton } from "./DeleteCatalogButtons";

export default async function CatalogPage() {
  const [categories, subcategories, brands, units] = await Promise.all([
    queryAll<Category>("categories", { orderBy: [["name", "asc"]] }),
    queryAll<Subcategory>("subcategories", { orderBy: [["name", "asc"]] }),
    queryAll<Brand>("brands", { orderBy: [["name", "asc"]] }),
    queryAll<Unit>("units", { orderBy: [["name", "asc"]] }),
  ]);

  // Group subcategories by category
  const categoriesWithSubs = categories.map((c) => ({
    ...c,
    subcategories: subcategories.filter((s) => s.categoryId === c.id),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Catálogos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie categorias, subcategorias, marcas e unidades para usar no cadastro de produtos.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <div className="card p-5">
          <h2 className="text-sm font-semibold">Categorias</h2>
          <p className="mt-1 text-xs text-muted-foreground">Dica: use nomes curtos e padronizados.</p>
          <div className="mt-4"><CreateCategoryForm /></div>
          <div className="mt-6 overflow-hidden rounded-[var(--radius-lg)] border border-border">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Subcategorias</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {categoriesWithSubs.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={3}>Nenhuma categoria ainda.</td>
                  </tr>
                ) : (
                  categoriesWithSubs.map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="font-medium">{c.name}</td>
                      <td className="text-muted-foreground">{c.subcategories.length}</td>
                      <td className="text-right">
                        <DeleteCatalogButton kind="category" id={c.id} name={c.name} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold">Subcategorias</h2>
          <p className="mt-1 text-xs text-muted-foreground">Sempre vinculadas a uma categoria.</p>
          <div className="mt-4">
            <CreateSubcategoryForm categories={categories.map(({ id, name }) => ({ id, name }))} />
          </div>
          <div className="mt-6 space-y-4">
            {categoriesWithSubs.length === 0 ? (
              <div className="text-sm text-muted-foreground">Crie uma categoria primeiro.</div>
            ) : (
              categoriesWithSubs.map((c) => (
                <div key={c.id} className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.subcategories.length} itens</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.subcategories.length === 0 ? (
                      <span className="text-sm text-muted-foreground">Sem subcategorias.</span>
                    ) : (
                      c.subcategories.map((s) => (
                        <div
                          key={s.id}
                          className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs"
                        >
                          <span>{s.name}</span>
                          <DeleteCatalogButton kind="subcategory" id={s.id} name={`${c.name} • ${s.name}`} compact />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold">Marcas</h2>
          <p className="mt-1 text-xs text-muted-foreground">Sugestões para padronizar nomes.</p>
          <div className="mt-4"><CreateBrandForm /></div>
          <div className="mt-6 overflow-hidden rounded-[var(--radius-lg)] border border-border">
            <table className="table">
              <thead>
                <tr><th>Nome</th><th className="text-right">Ações</th></tr>
              </thead>
              <tbody>
                {brands.length === 0 ? (
                  <tr><td className="px-4 py-6 text-muted-foreground" colSpan={2}>Nenhuma marca ainda.</td></tr>
                ) : (
                  brands.map((b) => (
                    <tr key={b.id} className="border-t border-border">
                      <td className="font-medium">{b.name}</td>
                      <td className="text-right"><DeleteCatalogButton kind="brand" id={b.id} name={b.name} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold">Unidades</h2>
          <p className="mt-1 text-xs text-muted-foreground">Ex: Un, Lata, Kg, Litro.</p>
          <div className="mt-4"><CreateUnitForm /></div>
          <div className="mt-6 overflow-hidden rounded-[var(--radius-lg)] border border-border">
            <table className="table">
              <thead>
                <tr><th>Nome</th><th className="text-right">Ações</th></tr>
              </thead>
              <tbody>
                {units.length === 0 ? (
                  <tr><td className="px-4 py-6 text-muted-foreground" colSpan={2}>Nenhuma unidade ainda.</td></tr>
                ) : (
                  units.map((u) => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="font-medium">{u.name}</td>
                      <td className="text-right"><DeleteCatalogButton kind="unit" id={u.id} name={u.name} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
