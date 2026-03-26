"use client";

import { useEffect, useMemo, useState } from "react";

type TabId = "details" | "movements";

export function ProductTabs({
  initialTab,
  details,
  movements,
}: {
  initialTab: TabId;
  details: React.ReactNode;
  movements: React.ReactNode;
}) {
  const [tab, setTab] = useState<TabId>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const content = useMemo(() => {
    if (tab === "movements") return movements;
    return details;
  }, [details, movements, tab]);

  function switchTab(next: TabId) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <div className="space-y-4">
      <div className="tabs">
        <button
          type="button"
          className={`tab ${tab === "details" ? "tab-active" : ""}`}
          onClick={() => switchTab("details")}
        >
          Dados
        </button>
        <button
          type="button"
          className={`tab ${tab === "movements" ? "tab-active" : ""}`}
          onClick={() => switchTab("movements")}
        >
          Movimentos
        </button>
      </div>

      {content}
    </div>
  );
}

