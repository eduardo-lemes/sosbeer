"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "./SidebarProvider";

const LINKS = [
  { href: "/products", label: "Produtos" },
  { href: "/catalog", label: "Catálogos" },
  { href: "/cash", label: "Caixa" },
  { href: "/sales", label: "Vendas" },
  { href: "/payables", label: "Contas a pagar" },
  { href: "/purchases", label: "Compras" },
  { href: "/reports", label: "Relatórios" },
  { href: "/stock", label: "Estoque" },
  { href: "/movements", label: "Movimentos" },
  { href: "/settings", label: "Configurações" },
] as const;

export function SideNav({ variant }: { variant: "header" | "sidebar" }) {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const isCollapsed = variant === "sidebar" && collapsed;

  return (
    <nav className={variant === "sidebar" ? `sidenav ${isCollapsed ? "sidenav-collapsed" : ""}` : "flex items-center gap-4 text-sm"}>
      {LINKS.map((l) => {
        const isActive = pathname === l.href || pathname.startsWith(`${l.href}/`);
        const className =
          variant === "sidebar"
            ? `sidenav-link ${isCollapsed ? "sidenav-link-collapsed" : ""} ${isActive ? "sidenav-link-active" : ""}`
            : `${isActive ? "text-foreground" : "text-muted-foreground"} hover:text-foreground`;

        return (
          <Link
            key={l.href}
            href={l.href}
            className={className}
            title={isCollapsed ? l.label : undefined}
          >
            {isCollapsed ? (
              <>
                <span className="sidenav-icon" aria-hidden>
                  <NavIcon href={l.href} />
                </span>
                <span className="sr-only">{l.label}</span>
              </>
            ) : (
              <span className="flex items-center gap-2">
                <span className="sidenav-icon-inline" aria-hidden>
                  <NavIcon href={l.href} />
                </span>
                <span>{l.label}</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function NavIcon({ href }: { href: (typeof LINKS)[number]["href"] }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (href === "/products") {
    return (
      <svg {...common}>
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="M12 22V12" />
        <path d="M3.3 7.3 12 12l8.7-4.7" />
      </svg>
    );
  }

  if (href === "/catalog") {
    return (
      <svg {...common}>
        <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        <path d="M8 6h8" />
        <path d="M8 10h8" />
      </svg>
    );
  }

  if (href === "/cash") {
    return (
      <svg {...common}>
        <path d="M6 3h12a2 2 0 0 1 2 2v6H4V5a2 2 0 0 1 2-2Z" />
        <path d="M4 11h16v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
        <path d="M16 15h.01" />
      </svg>
    );
  }

  if (href === "/sales") {
    return (
      <svg {...common}>
        <path d="M6 2h12v20H6z" />
        <path d="M9 6h6" />
        <path d="M9 10h6" />
        <path d="M9 14h6" />
      </svg>
    );
  }

  if (href === "/payables") {
    return (
      <svg {...common}>
        <path d="M6 2h9l3 3v17H6z" />
        <path d="M15 2v3h3" />
        <path d="M9 9h6" />
        <path d="M9 13h6" />
        <path d="M9 17h4" />
      </svg>
    );
  }

  if (href === "/purchases") {
    return (
      <svg {...common}>
        <path d="M3 7h18" />
        <path d="M5 7v14h14V7" />
        <path d="M8 11h8" />
        <path d="M8 15h8" />
      </svg>
    );
  }

  if (href === "/reports") {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M20 19V9" />
        <path d="M8 19v-6" />
        <path d="M12 19v-10" />
        <path d="M16 19v-3" />
      </svg>
    );
  }

  if (href === "/stock") {
    return (
      <svg {...common}>
        <path d="M20 7h-9" />
        <path d="M14 17H5" />
        <path d="M20 17h-2" />
        <path d="M5 7h2" />
        <path d="M9 7h2" />
        <path d="M7 17h2" />
        <path d="M5 12h14" />
      </svg>
    );
  }

  if (href === "/movements") {
    return (
      <svg {...common}>
        <path d="M3 12h18" />
        <path d="M7 8l-4 4 4 4" />
        <path d="M17 16l4-4-4-4" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 3a9 9 0 1 0 9 9" />
      <path d="M12 7h.01" />
      <path d="M11 11h2v6h-2z" />
    </svg>
  );
}
