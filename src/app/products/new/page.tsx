import Link from "next/link";
import { ProductForm } from "../ProductForm";
import { createProduct } from "../actions";
import { queryAll, type Category, type Subcategory, type Brand, type Unit } from "@/lib/db";

export default async function NewProductPage() {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Novo produto</h1>
        <Link href="/products" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          Voltar
        </Link>
      </div>

      <div className="card p-5">
        <ProductForm
          submitLabel="Criar"
          action={createProduct}
          autoGenerateInternalCode
          categorySuggestions={categorySuggestions}
          subcategorySuggestionsByCategory={subcategorySuggestionsByCategory}
          brandSuggestions={brands.map((b) => b.name)}
          unitSuggestions={units.map((u) => u.name)}
        />
      </div>
    </div>
  );
}
