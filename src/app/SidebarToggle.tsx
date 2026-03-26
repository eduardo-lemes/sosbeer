"use client";

import { useSidebar } from "./SidebarProvider";

export function SidebarToggle() {
  const { collapsed, toggle } = useSidebar();

  return (
    <button
      type="button"
      className="btn-icon hidden lg:inline-flex"
      onClick={toggle}
      title={collapsed ? "Mostrar menu" : "Esconder menu"}
      aria-label={collapsed ? "Mostrar menu" : "Esconder menu"}
    >
      {collapsed ? "⟫" : "⟪"}
    </button>
  );
}

