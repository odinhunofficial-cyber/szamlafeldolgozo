"use client";

import { createContext, useContext, useState } from "react";

const TabCtx = createContext<{
  value: string;
  setValue: (v: string) => void;
}>({ value: "szamlak", setValue: () => {} });

export function NavTabs({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState("szamlak");

  return (
    <TabCtx.Provider value={{ value, setValue }}>
      <div
        className="row"
        style={{ gap: 8, marginTop: 18, flexWrap: "nowrap" }}
      >
        {children}
      </div>
    </TabCtx.Provider>
  );
}

export function NavTab({ value, label }: { value: string; label: string }) {
  const ctx = useContext(TabCtx);
  const active = ctx.value === value;

  return (
    <button
      type="button"
      className={active ? "" : "secondary"}
      style={{ flex: "0 0 auto" }}
      onClick={() => ctx.setValue(value)}
    >
      {label}
    </button>
  );
}

export function NavPanel({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  const ctx = useContext(TabCtx);
  if (ctx.value !== value) return null;
  return <>{children}</>;
}
