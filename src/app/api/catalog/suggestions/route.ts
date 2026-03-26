import { NextResponse } from "next/server";
import { queryAll, type Category, type Subcategory, type Brand, type Unit, type Supplier } from "@/lib/db";

function key(name: string) {
  return name.trim().toLocaleLowerCase("pt-BR");
}

export async function GET() {
  const [categories, subcategories, brands, units, suppliers] = await Promise.all([
    queryAll<Category>("categories", { orderBy: [["name", "asc"]] }),
    queryAll<Subcategory>("subcategories", { orderBy: [["name", "asc"]] }),
    queryAll<Brand>("brands", { orderBy: [["name", "asc"]] }),
    queryAll<Unit>("units", { orderBy: [["name", "asc"]] }),
    queryAll<Supplier>("suppliers", { orderBy: [["name", "asc"]] }),
  ]);

  const subcategoriesByCategory: Record<string, string[]> = {};
  for (const c of categories) {
    subcategoriesByCategory[key(c.name)] = subcategories
      .filter((s) => s.categoryId === c.id)
      .map((s) => s.name);
  }

  return NextResponse.json({
    categories: categories.map((c) => c.name),
    subcategoriesByCategory,
    brands: brands.map((b) => b.name),
    units: units.map((u) => u.name),
    suppliers: suppliers.map((s) => s.name),
  });
}
