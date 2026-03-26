import { NextResponse } from "next/server";
import { z } from "zod";
import { queryAll, getStockByProductIds, type Product } from "@/lib/db";

const schema = z.object({
  q: z.string().trim().default(""),
  take: z.coerce.number().min(1).max(50).default(20),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = schema.safeParse({
    q: searchParams.get("q") ?? "",
    take: searchParams.get("take") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ message: "Query inválida" }, { status: 400 });

  const q = parsed.data.q;
  if (!q) return NextResponse.json({ items: [] });

  const lower = q.toLowerCase();

  // Fetch active products and filter client-side
  const allProducts = await queryAll<Product>("products", {
    where: [["active", "==", true]],
    orderBy: [["name", "asc"]],
    limit: 500,
  });

  const products = allProducts
    .filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.internalCode.toLowerCase().includes(lower) ||
        (p.eanGtin && p.eanGtin.toLowerCase().includes(lower)),
    )
    .slice(0, parsed.data.take);

  const ids = products.filter((p) => p.trackStock).map((p) => p.id);
  const stockMap = await getStockByProductIds(ids);

  return NextResponse.json({
    items: products.map((p) => ({
      id: p.id,
      name: p.name,
      internalCode: p.internalCode,
      eanGtin: p.eanGtin,
      imageUrl: p.imageUrl,
      salePrice: p.salePrice.toString(),
      trackStock: p.trackStock,
      stock: (stockMap.get(p.id) ?? 0).toString(),
    })),
  });
}
