"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { FormState } from "./actions";
import { MoneyInput } from "./MoneyInput";
import { formatQty } from "@/lib/format";
import { toCentsDigits } from "@/lib/money";
import { CatalogPicker } from "@/components/CatalogPicker";

type Product = {
  id?: string;
  name?: string;
  internalCode?: string;
  eanGtin?: string | null;
  imageUrl?: string | null;
  salePrice?: string;
  costPrice?: string | null;
  categoryName?: string | null;
  subcategoryName?: string | null;
  brandName?: string | null;
  unitName?: string | null;
  trackStock?: boolean;
  stockMin?: string | null;
  stockMax?: string | null;
  location?: string | null;
  notes?: string | null;
  active?: boolean;
};

export function ProductForm({
  initial,
  action,
  submitLabel,
  autoGenerateInternalCode,
  currentStock,
  categorySuggestions,
  subcategorySuggestionsByCategory,
  brandSuggestions,
  unitSuggestions,
}: {
  initial?: Product;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  autoGenerateInternalCode?: boolean;
  currentStock?: string;
  categorySuggestions?: string[];
  subcategorySuggestionsByCategory?: Record<string, string[]>;
  brandSuggestions?: string[];
  unitSuggestions?: string[];
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(action, {});
  const initialTrackStock = useMemo(() => initial?.trackStock ?? true, [initial?.trackStock]);
  const [trackStock, setTrackStock] = useState(initialTrackStock);
  const [codeMode, setCodeMode] = useState<"auto" | "manual">(
    autoGenerateInternalCode && !initial?.internalCode ? "auto" : "manual",
  );
  const [internalCode, setInternalCode] = useState(initial?.internalCode ?? "");
  const [suggestedCode, setSuggestedCode] = useState<string>("");
  const [costDigits, setCostDigits] = useState(() => toCentsDigits(initial?.costPrice ?? ""));
  const [saleDigits, setSaleDigits] = useState(() => toCentsDigits(initial?.salePrice ?? ""));
  const [cost, setCost] = useState<number | null>(() => digitsToNumber(costDigits));
  const [sale, setSale] = useState<number | null>(() => digitsToNumber(saleDigits));
  const [markupTarget, setMarkupTarget] = useState("");
  const [marginTarget, setMarginTarget] = useState("");
  const saleBeforeCalcRef = useRef<string | null>(null);
  const calcModeRef = useRef<"markup" | "margin" | null>(null);
  const [categoryName, setCategoryName] = useState(String(initial?.categoryName ?? ""));
  const [subcategoryName, setSubcategoryName] = useState(String(initial?.subcategoryName ?? ""));
  const [brandName, setBrandName] = useState(String(initial?.brandName ?? ""));
  const [unitName, setUnitName] = useState(String(initial?.unitName ?? ""));
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.imageUrl ?? null);

  const [categories, setCategories] = useState<string[]>(categorySuggestions ?? []);
  const [subcategoriesByCategory, setSubcategoriesByCategory] = useState<Record<string, string[]>>(
    subcategorySuggestionsByCategory ?? {},
  );
  const [brands, setBrands] = useState<string[]>(brandSuggestions ?? []);
  const [units, setUnits] = useState<string[]>(unitSuggestions ?? []);

  const categoryDialogRef = useRef<HTMLDialogElement | null>(null);
  const subcategoryDialogRef = useRef<HTMLDialogElement | null>(null);
  const brandDialogRef = useRef<HTMLDialogElement | null>(null);
  const unitDialogRef = useRef<HTMLDialogElement | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [newUnitName, setNewUnitName] = useState("");
  const [catalogMessage, setCatalogMessage] = useState<string>("");
  const [isCatalogBusy, setIsCatalogBusy] = useState(false);
  const categoryKey = normalizeKey(categoryName);
  const subcategorySuggestions =
    categoryKey && subcategoriesByCategory[categoryKey] ? subcategoriesByCategory[categoryKey] : [];

  async function refreshCatalogSuggestions() {
    const res = await fetch("/api/catalog/suggestions", { method: "GET" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      categories: string[];
      subcategoriesByCategory: Record<string, string[]>;
      brands: string[];
      units?: string[];
      suppliers?: string[];
    };
    setCategories(data.categories);
    setSubcategoriesByCategory(data.subcategoriesByCategory);
    setBrands(data.brands ?? []);
    setUnits(data.units ?? []);
  }

  async function quickCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      setIsCatalogBusy(true);
      setCatalogMessage("");
      const res = await fetch("/api/catalog/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setCatalogMessage(body?.message ?? "Não foi possível criar a categoria.");
        return;
      }
      const created = (await res.json()) as { name: string };
      setCategoryName(created.name);
      setNewCategoryName("");
      categoryDialogRef.current?.close();
      await refreshCatalogSuggestions();
    } finally {
      setIsCatalogBusy(false);
    }
  }

  async function quickCreateSubcategory() {
    const cat = categoryName.trim();
    const name = newSubcategoryName.trim();
    if (!cat || !name) return;
    try {
      setIsCatalogBusy(true);
      setCatalogMessage("");
      const res = await fetch("/api/catalog/subcategories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryName: cat, name }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setCatalogMessage(body?.message ?? "Não foi possível criar a subcategoria.");
        return;
      }
      const created = (await res.json()) as { name: string; categoryName: string };
      setCategoryName(created.categoryName);
      setSubcategoryName(created.name);
      setNewSubcategoryName("");
      subcategoryDialogRef.current?.close();
      await refreshCatalogSuggestions();
    } finally {
      setIsCatalogBusy(false);
    }
  }

  async function quickCreateBrand() {
    const name = newBrandName.trim();
    if (!name) return;
    try {
      setIsCatalogBusy(true);
      setCatalogMessage("");
      const res = await fetch("/api/catalog/brands", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setCatalogMessage(body?.message ?? "Não foi possível criar a marca.");
        return;
      }
      const created = (await res.json()) as { name: string };
      setBrandName(created.name);
      setNewBrandName("");
      brandDialogRef.current?.close();
      await refreshCatalogSuggestions();
    } finally {
      setIsCatalogBusy(false);
    }
  }

  async function quickCreateUnit() {
    const name = newUnitName.trim();
    if (!name) return;
    try {
      setIsCatalogBusy(true);
      setCatalogMessage("");
      const res = await fetch("/api/catalog/units", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setCatalogMessage(body?.message ?? "Não foi possível criar a unidade.");
        return;
      }
      const created = (await res.json()) as { name: string };
      setUnitName(created.name);
      setNewUnitName("");
      unitDialogRef.current?.close();
      await refreshCatalogSuggestions();
    } finally {
      setIsCatalogBusy(false);
    }
  }

  function closeCategoryModal() {
    setCatalogMessage("");
    categoryDialogRef.current?.close();
  }

  function closeSubcategoryModal() {
    setCatalogMessage("");
    subcategoryDialogRef.current?.close();
  }

  function closeBrandModal() {
    setCatalogMessage("");
    brandDialogRef.current?.close();
  }

  function closeUnitModal() {
    setCatalogMessage("");
    unitDialogRef.current?.close();
  }

  useEffect(() => {
    if (codeMode !== "auto") return;
    if (initial?.internalCode) return;
    let cancelled = false;
    fetch("/api/products/internal-code", { method: "GET" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Falha ao buscar código");
        return (await res.json()) as { code: string };
      })
      .then(({ code }) => {
        if (cancelled) return;
        setSuggestedCode(code);
      })
      .catch(() => {
        if (cancelled) return;
        setSuggestedCode("—");
      });

    return () => {
      cancelled = true;
    };
  }, [codeMode, initial?.internalCode]);

  const priceSummary = useMemo(() => {
    if (sale == null) return null;
    const saleValue = sale;
    const costValue = cost ?? null;
    const profit = saleValue - (costValue ?? 0);
    const hasCost = costValue != null;
    const markup = hasCost && costValue > 0 ? ((saleValue - costValue) / costValue) * 100 : null;
    const margin = hasCost && saleValue > 0 ? ((saleValue - (costValue ?? 0)) / saleValue) * 100 : null;
    return { saleValue, costValue, profit, markup, margin };
  }, [sale, cost]);

  function setCostFromDigits(nextDigits: string) {
    setCostDigits(nextDigits);
    setCost(digitsToNumber(nextDigits));

    if (markupTarget.trim()) {
      const cents = calcSaleCentsFromMarkup(nextDigits, markupTarget);
      if (cents != null) setSaleFromCents(cents);
      return;
    }

    if (marginTarget.trim()) {
      const cents = calcSaleCentsFromMargin(nextDigits, marginTarget);
      if (cents != null) setSaleFromCents(cents);
    }
  }

  function setSaleFromDigits(nextDigits: string) {
    setSaleDigits(nextDigits);
    setSale(digitsToNumber(nextDigits));
  }

  function revertSaleIfNeeded(mode: "markup" | "margin") {
    if (calcModeRef.current !== mode) return;
    const prev = saleBeforeCalcRef.current;
    saleBeforeCalcRef.current = null;
    calcModeRef.current = null;
    if (prev != null) setSaleFromDigits(prev);
  }

  function startCalcIfNeeded(mode: "markup" | "margin") {
    if (calcModeRef.current === mode) return;
    if (saleBeforeCalcRef.current == null) saleBeforeCalcRef.current = saleDigits;
    calcModeRef.current = mode;
  }

  function setSaleFromCents(cents: number) {
    const next = String(Math.max(0, Math.round(cents)));
    setSaleDigits(next);
    setSale(Number(next) / 100);
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <div className="rounded-[var(--radius-lg)] border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {state.message}
        </div>
      ) : null}

      {/* ── Section 1 · Identificação ── */}
      <section className="card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-xs text-primary">📦</span>
            Identificação
          </h2>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]">
          <div className="grid grid-cols-12 gap-4">
            <Field label="Nome do produto *" className="col-span-12 lg:col-span-8">
              <input name="name" defaultValue={initial?.name ?? ""} className="input" required autoFocus />
            </Field>
            <Field label="EAN/GTIN" className="col-span-12 lg:col-span-4">
              <input name="eanGtin" defaultValue={initial?.eanGtin ?? ""} className="input" inputMode="numeric" autoComplete="off" />
            </Field>
            <Field label="Código interno" className="col-span-12 sm:col-span-6">
              {autoGenerateInternalCode && !initial?.internalCode ? (
                <div className="mb-2">
                  <label className="toggle toggle-sm">
                    <input type="checkbox" className="sr-only peer" checked={codeMode === "auto"} onChange={(e) => { const next = e.target.checked ? "auto" : "manual"; setCodeMode(next); if (next === "auto") setSuggestedCode(""); }} />
                    <span className="toggle-track peer-checked:border-primary/40 peer-checked:bg-primary"><span className="toggle-thumb peer-checked:translate-x-5" /></span>
                    <span>Automático</span>
                  </label>
                </div>
              ) : null}
              {codeMode === "auto" && !initial?.internalCode ? (
                <div>
                  <input value={suggestedCode ? suggestedCode : "Carregando…"} className="input" disabled />
                  <div className="mt-1 text-xs text-muted-foreground">Próximo código disponível.</div>
                </div>
              ) : (
                <input name="internalCode" value={internalCode} onChange={(e) => setInternalCode(e.target.value)} onBlur={(e) => { const raw = e.target.value.trim(); if (/^\d+$/.test(raw) && raw.length < 6) { setInternalCode(raw.padStart(6, "0")); } else { setInternalCode(raw); } }} className="input" placeholder="ex: 000220" autoComplete="off" inputMode="numeric" />
              )}
            </Field>
          </div>

          {/* Foto — coluna direita */}
          <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border-2 border-dashed border-border bg-muted/20 p-5 transition hover:border-primary/40 hover:bg-muted/30">
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt="" className="h-36 w-36 rounded-[var(--radius-lg)] border border-border bg-muted object-cover" />
            ) : (
              <div className="grid h-28 w-28 place-items-center rounded-[var(--radius-lg)] bg-muted/60 text-4xl text-muted-foreground">📷</div>
            )}
            <label className="cursor-pointer rounded-[var(--radius-md)] border border-border bg-surface px-4 py-2 text-sm font-medium transition hover:bg-muted">
              Escolher foto
              <input type="file" name="image" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { const f = e.currentTarget.files?.[0]; if (!f) return; setImagePreview(URL.createObjectURL(f)); }} />
            </label>
            <span className="text-xs text-muted-foreground">JPG/PNG/WebP • até 1,5 MB</span>
          </div>
        </div>
      </section>

      {/* ── Section 2 · Preços ── */}
      <section className="card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-success/15 text-xs text-success">💲</span>
            Preços
          </h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <MoneyInput name="costPrice" label="Preço custo" defaultValue={initial?.costPrice ?? ""} valueDigits={costDigits} onDigitsChange={(d) => { setCostFromDigits(d); }} />
            <Field label="Markup (%)">
              <div className="relative">
                <input value={markupTarget} onChange={(e) => { const next = e.target.value; setMarkupTarget(next); if (!next.trim()) { revertSaleIfNeeded("markup"); return; } startCalcIfNeeded("markup"); setMarginTarget(""); const cents = calcSaleCentsFromMarkup(costDigits, next); if (cents != null) setSaleFromCents(cents); }} className="input pr-9" inputMode="decimal" placeholder="ex: 50" autoComplete="off" disabled={!costDigits} />
                <span className="pointer-events-none absolute inset-y-0 right-0 inline-flex items-center pr-3 text-sm text-muted-foreground">%</span>
              </div>
              {!markupTarget.trim() && priceSummary?.markup != null ? <div className="mt-1 text-xs text-muted-foreground">Atual: {round1(priceSummary.markup)}%</div> : null}
            </Field>
            <Field label="Margem (%)">
              <div className="relative">
                <input value={marginTarget} onChange={(e) => { const next = e.target.value; setMarginTarget(next); if (!next.trim()) { revertSaleIfNeeded("margin"); return; } startCalcIfNeeded("margin"); setMarkupTarget(""); const cents = calcSaleCentsFromMargin(costDigits, next); if (cents != null) setSaleFromCents(cents); }} className="input pr-9" inputMode="decimal" placeholder="ex: 40" autoComplete="off" disabled={!costDigits} />
                <span className="pointer-events-none absolute inset-y-0 right-0 inline-flex items-center pr-3 text-sm text-muted-foreground">%</span>
              </div>
              {!marginTarget.trim() && priceSummary?.margin != null ? <div className="mt-1 text-xs text-muted-foreground">Atual: {round1(priceSummary.margin)}%</div> : null}
            </Field>
            <MoneyInput name="salePrice" label="Preço venda *" defaultValue={initial?.salePrice ?? ""} required valueDigits={saleDigits} onDigitsChange={(d) => { setSaleFromDigits(d); saleBeforeCalcRef.current = null; calcModeRef.current = null; if (markupTarget) setMarkupTarget(""); if (marginTarget) setMarginTarget(""); }} />
          </div>

          {/* Resumo de preço inline */}
          {priceSummary ? (
            <div className="mt-5 rounded-[var(--radius-lg)] border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumo</span>
                {priceSummary.costValue == null ? <span className="text-xs text-muted-foreground">Informe o custo para ver markup e margem</span> : null}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <Metric label="Venda" value={formatBRL(priceSummary.saleValue)} tone="neutral" />
                <Metric label="Custo" value={formatBRL(priceSummary.costValue ?? 0)} tone="neutral" muted={!priceSummary.costValue} />
                <Metric label="Lucro" value={formatBRL(priceSummary.profit)} tone={priceSummary.profit >= 0 ? "good" : "bad"} />
                <Metric label="Markup" value={priceSummary.markup != null ? `${round1(priceSummary.markup)}%` : "—"} tone={priceSummary.markup != null && priceSummary.markup >= 0 ? "good" : "neutral"} muted={priceSummary.markup == null} />
                <Metric label="Margem" value={priceSummary.margin != null ? `${round1(priceSummary.margin)}%` : "—"} tone={priceSummary.margin != null && priceSummary.margin >= 0 ? "good" : "neutral"} muted={priceSummary.margin == null} />
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[var(--radius-lg)] border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Informe o preço de venda para ver o resumo de preços.
            </div>
          )}
        </div>
      </section>

      {/* ── Section 3 · Classificação ── */}
      <section className="card">
        <div className="border-b border-border bg-muted/30 px-5 py-3.5 rounded-t-[var(--radius-lg)]">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-xs text-accent">🏷️</span>
            Classificação
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Personalize em{" "}
            <a href="/catalog" className="text-primary hover:underline">Catálogos</a>.
          </p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Categoria">
            <div className="flex gap-2">
              <input type="hidden" name="categoryName" value={categoryName} />
              <CatalogPicker value={categoryName} onChange={(v) => { setCategoryName(v); if (!v.trim()) setSubcategoryName(""); }} placeholder="Selecione" options={categories} />
              <button type="button" className="btn-inline shrink-0" onClick={() => { setCatalogMessage(""); setNewCategoryName(categoryName.trim()); categoryDialogRef.current?.showModal(); }}>+</button>
            </div>
          </Field>
          <Field label="Subcategoria">
            <div className="flex gap-2">
              <input type="hidden" name="subcategoryName" value={subcategoryName} />
              <CatalogPicker value={subcategoryName} onChange={(v) => setSubcategoryName(v)} placeholder={categoryName.trim() ? "Selecione" : "Categoria primeiro"} options={subcategorySuggestions} disabled={!categoryName.trim()} />
              <button type="button" className="btn-inline shrink-0" disabled={!categoryName.trim()} onClick={() => { setCatalogMessage(""); setNewSubcategoryName(subcategoryName.trim()); subcategoryDialogRef.current?.showModal(); }}>+</button>
            </div>
            {!categoryName.trim() ? <div className="mt-1 text-xs text-muted-foreground">Informe a categoria para habilitar.</div> : null}
          </Field>
          <Field label="Marca">
            <div className="flex gap-2">
              <input type="hidden" name="brandName" value={brandName} />
              <CatalogPicker value={brandName} onChange={(v) => setBrandName(v)} placeholder="Selecione" options={brands} />
              <button type="button" className="btn-inline shrink-0" onClick={() => { setCatalogMessage(""); setNewBrandName(brandName.trim()); brandDialogRef.current?.showModal(); }}>+</button>
            </div>
          </Field>
          <Field label="Unidade de medida">
            <div className="flex gap-2">
              <input type="hidden" name="unitName" value={unitName} />
              <CatalogPicker value={unitName} onChange={(v) => setUnitName(v)} placeholder="Selecione" options={units} />
              <button type="button" className="btn-inline shrink-0" onClick={() => { setCatalogMessage(""); setNewUnitName(unitName.trim()); unitDialogRef.current?.showModal(); }}>+</button>
            </div>
          </Field>
        </div>
      </section>

      {/* ── Section 4 · Estoque & Opções ── */}
      <section className="card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-xs text-primary">📊</span>
            Estoque &amp; Opções
          </h2>
        </div>
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap gap-4">
            <label className="toggle">
              <input type="checkbox" name="trackStock" className="sr-only peer" defaultChecked={initial?.trackStock ?? true} onChange={(e) => setTrackStock(e.target.checked)} />
              <span className="toggle-track peer-checked:border-primary/40 peer-checked:bg-primary"><span className="toggle-thumb peer-checked:translate-x-5" /></span>
              <span>Controlar estoque</span>
            </label>
            <label className="toggle">
              <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} className="sr-only peer" />
              <span className="toggle-track peer-checked:border-primary/40 peer-checked:bg-primary"><span className="toggle-thumb peer-checked:translate-x-5" /></span>
              <span>Ativo</span>
            </label>
          </div>

          {trackStock ? (
            <div className="grid grid-cols-12 gap-4 rounded-[var(--radius-lg)] border border-border bg-muted/10 p-4">
              {currentStock != null ? (
                <Field label="Estoque atual" className="col-span-6 sm:col-span-3 lg:col-span-2">
                  <input className="input" value={formatQty(currentStock)} disabled />
                </Field>
              ) : null}
              <Field label="Novo estoque (ajuste)" className="col-span-6 sm:col-span-3 lg:col-span-2">
                <input name="stockAdjustTo" type="number" step="1" className="input" inputMode="numeric" placeholder="(opcional)" onInput={(e) => { const el = e.currentTarget; el.value = el.value.replace(/[.,].*$/, ""); }} />
              </Field>
              <Field label="Obs. do ajuste" className="col-span-12 sm:col-span-6 lg:col-span-4">
                <input name="stockAdjustNote" className="input" placeholder="ex: contagem do dia" />
              </Field>
              <Field label="Mínimo" className="col-span-4 sm:col-span-3 lg:col-span-1">
                <input name="stockMin" type="number" step="1" defaultValue={initial?.stockMin ?? ""} className="input" inputMode="numeric" onInput={(e) => { const el = e.currentTarget; el.value = el.value.replace(/[.,].*$/, ""); }} />
              </Field>
              <Field label="Máximo" className="col-span-4 sm:col-span-3 lg:col-span-1">
                <input name="stockMax" type="number" step="1" defaultValue={initial?.stockMax ?? ""} className="input" inputMode="numeric" onInput={(e) => { const el = e.currentTarget; el.value = el.value.replace(/[.,].*$/, ""); }} />
              </Field>
              <Field label="Localização" className="col-span-12 sm:col-span-6 lg:col-span-2">
                <input name="location" defaultValue={initial?.location ?? ""} className="input" />
              </Field>
              <div className="col-span-12 text-xs text-muted-foreground">
                Se preencher o novo estoque, ao salvar será criado um movimento de <span className="font-medium">Ajuste</span> no histórico.
              </div>
            </div>
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Ative &quot;Controlar estoque&quot; para gerenciar quantidades.
            </div>
          )}

          <Field label="Observações">
            <textarea name="notes" defaultValue={initial?.notes ?? ""} className="textarea" rows={3} />
          </Field>
        </div>
      </section>

      {/* ── Action bar ── */}
      <div className="flex items-center justify-end gap-3 rounded-[var(--radius-lg)] border border-border bg-muted/20 px-5 py-4">
        <a href="/products" className="btn-ghost">Cancelar</a>
        <button type="submit" disabled={isPending} className="btn-primary px-8 disabled:opacity-60">
          {isPending ? "Salvando…" : submitLabel}
        </button>
      </div>

      {/* ── Modals ── */}
      <dialog ref={categoryDialogRef} className="modal" onClick={(e) => { if (e.target === e.currentTarget) closeCategoryModal(); }} onCancel={(e) => { e.preventDefault(); closeCategoryModal(); }}>
        <div className="modal-header">
          <div><div className="modal-title">Nova categoria</div><div className="modal-subtitle">Ela vai aparecer nas sugestões imediatamente.</div></div>
          <button type="button" className="btn-icon" onClick={closeCategoryModal} aria-label="Fechar">✕</button>
        </div>
        <div className="modal-body">
          {catalogMessage ? <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{catalogMessage}</div> : null}
          <input className="input" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="ex: Bebidas" autoFocus />
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={closeCategoryModal} disabled={isCatalogBusy}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={quickCreateCategory} disabled={isCatalogBusy}>Criar</button>
          </div>
        </div>
      </dialog>

      <dialog ref={subcategoryDialogRef} className="modal" onClick={(e) => { if (e.target === e.currentTarget) closeSubcategoryModal(); }} onCancel={(e) => { e.preventDefault(); closeSubcategoryModal(); }}>
        <div className="modal-header">
          <div><div className="modal-title">Nova subcategoria</div><div className="modal-subtitle">Vinculada à categoria: <span className="font-medium">{categoryName || "—"}</span></div></div>
          <button type="button" className="btn-icon" onClick={closeSubcategoryModal} aria-label="Fechar">✕</button>
        </div>
        <div className="modal-body">
          {catalogMessage ? <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{catalogMessage}</div> : null}
          <input className="input" value={newSubcategoryName} onChange={(e) => setNewSubcategoryName(e.target.value)} placeholder="ex: Whisky" autoFocus />
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={closeSubcategoryModal} disabled={isCatalogBusy}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={quickCreateSubcategory} disabled={isCatalogBusy}>Criar</button>
          </div>
        </div>
      </dialog>

      <dialog ref={brandDialogRef} className="modal" onClick={(e) => { if (e.target === e.currentTarget) closeBrandModal(); }} onCancel={(e) => { e.preventDefault(); closeBrandModal(); }}>
        <div className="modal-header">
          <div><div className="modal-title">Nova marca</div><div className="modal-subtitle">Ela vai aparecer nas sugestões imediatamente.</div></div>
          <button type="button" className="btn-icon" onClick={closeBrandModal} aria-label="Fechar">✕</button>
        </div>
        <div className="modal-body">
          {catalogMessage ? <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{catalogMessage}</div> : null}
          <input className="input" value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} placeholder="ex: Bacardi" autoFocus />
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={closeBrandModal} disabled={isCatalogBusy}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={quickCreateBrand} disabled={isCatalogBusy}>Criar</button>
          </div>
        </div>
      </dialog>

      <dialog ref={unitDialogRef} className="modal" onClick={(e) => { if (e.target === e.currentTarget) closeUnitModal(); }} onCancel={(e) => { e.preventDefault(); closeUnitModal(); }}>
        <div className="modal-header">
          <div><div className="modal-title">Nova unidade</div><div className="modal-subtitle">Ela vai aparecer nas sugestões imediatamente.</div></div>
          <button type="button" className="btn-icon" onClick={closeUnitModal} aria-label="Fechar">✕</button>
        </div>
        <div className="modal-body">
          {catalogMessage ? <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{catalogMessage}</div> : null}
          <input className="input" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} placeholder="ex: Lata" autoFocus />
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={closeUnitModal} disabled={isCatalogBusy}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={quickCreateUnit} disabled={isCatalogBusy}>Criar</button>
          </div>
        </div>
      </dialog>
    </form>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <div className="mb-1 text-sm font-medium">{label}</div>
      {children}
    </label>
  );
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function round1(value: number) {
  if (!Number.isFinite(value)) return "0,0";
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

function digitsToNumber(digits: string): number | null {
  const only = (digits ?? "").replace(/\D/g, "");
  if (!only) return null;
  return Number(only) / 100;
}

function parsePercent(raw: string): number | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  let v = t.replace(/\s/g, "");
  v = v.replace(/%/g, "");
  if (v.includes(",")) {
    v = v.replace(/\./g, "");
    v = v.replace(",", ".");
  } else {
    v = v.replace(/,/g, ".");
  }
  const num = Number(v);
  if (!Number.isFinite(num)) return null;
  return num;
}

function calcSaleCentsFromMarkup(costDigits: string, markupText: string): number | null {
  const costCents = Number((costDigits ?? "").replace(/\D/g, ""));
  if (!costCents) return null;
  const markup = parsePercent(markupText);
  if (markup == null) return null;
  return Math.round(costCents * (1 + markup / 100));
}

function calcSaleCentsFromMargin(costDigits: string, marginText: string): number | null {
  const costCents = Number((costDigits ?? "").replace(/\D/g, ""));
  if (!costCents) return null;
  const margin = parsePercent(marginText);
  if (margin == null) return null;
  if (margin >= 100) return null;
  return Math.round(costCents / (1 - margin / 100));
}

function Metric({
  label,
  value,
  tone,
  muted,
}: {
  label: string;
  value: string;
  tone: "neutral" | "good" | "bad";
  muted?: boolean;
}) {
  const toneClass =
    tone === "good"
      ? "border-success/30 bg-success/10 text-success"
      : tone === "bad"
        ? "border-danger/30 bg-danger/10 text-danger"
        : "border-border bg-surface text-foreground";

  return (
    <div className={`rounded-[var(--radius-lg)] border px-4 py-3 ${toneClass} ${muted ? "opacity-70" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold leading-none">{value}</div>
    </div>
  );
}

function normalizeKey(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}
