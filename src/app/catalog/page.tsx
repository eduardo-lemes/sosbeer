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

  const categoriesWithSubs = categories.map((c) => ({
    ...c,
    subcategories: subcategories.filter((s) => s.categoryId === c.id),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Catálogos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie categorias, subcategorias, marcas e unidades para usar no cadastro de produtos.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* ── Categorias ── */}
        <section className="card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-xs text-primary">📂</span>
              Categorias
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Dica: use nomes curtos e padronizados.</p>
          </div>
          <div className="p-5">
            <CreateCategoryForm />
            <div className="mt-5 overflow-hidden rounded-[var(--radius-lg)] border border-border">
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
                    <tr><td className="px-4 py-6 text-muted-foreground" colSpan={3}>Nenhuma categoria ainda.</td></tr>
                  ) : (
                    categoriesWithSubs.map((c) => (
                      <tr key={c.id} className="border-t border-border">
                        <td className="font-medium">{c.name}</td>
                        <td className="text-muted-foreground">{c.subcategories.length}</td>
                        <td className="text-right"><DeleteCatalogButton kind="category" id={c.id} name={c.name} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Subcategorias ── */}
        <section className="card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-xs text-accent">🏷️</span>
              Subcategorias
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Sempre vinculadas a uma categoria.</p>
          </div>
          <div className="p-5">
            <CreateSubcategoryForm categories={categories.map(({ id, name }) => ({ id, name }))} />
            <div className="mt-5 space-y-3">
              {categoriesWithSubs.length === 0 ? (
                <div className="rounded-[var(--radius-lg)] border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Crie uma categoria primeiro.</div>
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
                          <div key={s.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs">
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
        </section>

        {/* ── Marcas ── */}
        <section className="card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-success/15 text-xs text-success">🏢</span>
              Marcas
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Sugestões para padronizar nomes.</p>
          </div>
          <div className="p-5">
            <CreateBrandForm />
            <div className="mt-5 overflow-hidden rounded-[var(--radius-lg)] border border-border">
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
        </section>

        {/* ── Unidades ── */}
        <section className="card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-xs text-primary">📐</span>
              Unidades
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Ex: Un, Lata, Kg, Litro.</p>
          </div>
          <div className="p-5">
            <CreateUnitForm />
            <div className="mt-5 overflow-hidden rounded-[var(--radius-lg)] border border-border">
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
        </section>
      </div>
    </div>
  );
}
