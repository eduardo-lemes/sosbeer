"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { rollbackPurchaseImport } from "../actions";

export function RollbackPurchaseButton({ id }: { id: string }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => setError(null);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  function open() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await rollbackPurchaseImport(id);
        close();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível desfazer.");
      }
    });
  }

  return (
    <>
      <button type="button" className="btn-ghost text-danger hover:bg-danger/10" onClick={open}>
        Desfazer aplicação
      </button>

      <dialog
        ref={dialogRef}
        className="modal"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
        onCancel={(e) => {
          e.preventDefault();
          dialogRef.current?.close();
        }}
      >
        <div className="modal-header">
          <div>
            <div className="modal-title">Desfazer aplicação</div>
            <div className="modal-subtitle">Isso remove as entradas de estoque geradas por essa importação.</div>
          </div>
          <button type="button" className="btn-icon" onClick={close} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="rounded-[var(--radius-lg)] border border-danger/30 bg-danger/10 px-4 py-3 text-sm">
            Use isso apenas se a importação foi aplicada com dados errados (ex: fardo x6).
          </div>
          {error ? <div className="text-sm text-danger">{error}</div> : null}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={close} disabled={isPending}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={onConfirm} disabled={isPending}>
              {isPending ? "Desfazendo..." : "Confirmar"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

