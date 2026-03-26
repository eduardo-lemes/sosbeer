"use client";

import { useActionState } from "react";
import { createBrand, createCategory, createSubcategory, createUnit, type CatalogFormState } from "./actions";

export function CreateCategoryForm() {
  const [state, formAction, isPending] = useActionState<CatalogFormState, FormData>(createCategory, {});

  return (
    <form action={formAction} className="space-y-3">
      {state.message ? (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input name="name" placeholder="Nova categoria (ex: Bebidas)" className="input" />
        <button className="btn-primary" disabled={isPending}>
          Criar
        </button>
      </div>
    </form>
  );
}

export function CreateSubcategoryForm({ categories }: { categories: Array<{ id: string; name: string }> }) {
  const [state, formAction, isPending] = useActionState<CatalogFormState, FormData>(createSubcategory, {});

  return (
    <form action={formAction} className="space-y-3">
      {state.message ? (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <select name="categoryId" className="select">
          <option value="">Categoria</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input name="name" placeholder="Nova subcategoria (ex: Whisky)" className="input sm:col-span-2" />
      </div>

      <button className="btn-primary" disabled={isPending}>
        Criar subcategoria
      </button>
    </form>
  );
}

export function CreateBrandForm() {
  const [state, formAction, isPending] = useActionState<CatalogFormState, FormData>(createBrand, {});

  return (
    <form action={formAction} className="space-y-3">
      {state.message ? (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input name="name" placeholder="Nova marca (ex: Bacardi)" className="input" />
        <button className="btn-primary" disabled={isPending}>
          Criar
        </button>
      </div>
    </form>
  );
}

export function CreateUnitForm() {
  const [state, formAction, isPending] = useActionState<CatalogFormState, FormData>(createUnit, {});

  return (
    <form action={formAction} className="space-y-3">
      {state.message ? (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input name="name" placeholder="Nova unidade (ex: Lata, Kg, Un)" className="input" />
        <button className="btn-primary" disabled={isPending}>
          Criar
        </button>
      </div>
    </form>
  );
}
