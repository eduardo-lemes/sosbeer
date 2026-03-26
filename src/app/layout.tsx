import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { SideNav } from "./SideNav";
import { SidebarProvider } from "./SidebarProvider";
import { SidebarToggle } from "./SidebarToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PDV Web",
  description: "MVP: Cadastro + Estoque",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SidebarProvider>
          <div className="min-h-dvh bg-muted text-foreground">
            <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
              <div className="flex w-full items-center justify-between gap-3 px-4 py-3 lg:px-6">
                <div className="flex items-center gap-3">
                  <SidebarToggle />
                  <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-primary to-accent text-primary-foreground">
                      P
                    </span>
                    <span>PDV Web</span>
                  </Link>
                </div>
                <div className="lg:hidden">
                  <SideNav variant="header" />
                </div>
              </div>
            </header>

            <div className="app-shell">
              <aside className="app-shell-sidebar hidden lg:block">
                <div className="app-shell-sidebar-inner">
                  <SideNav variant="sidebar" />
                  <div className="sidebar-hints mt-4 border-t border-border pt-4">
                    <div className="text-sm font-semibold">Dicas rápidas</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      No Caixa, use <span className="font-semibold text-foreground">F3</span> para iniciar uma nova venda.
                    </div>
                  </div>
                </div>
              </aside>
              <main className="app-shell-main">{children}</main>
            </div>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}
