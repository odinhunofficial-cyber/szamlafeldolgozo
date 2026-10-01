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
      <div className="tabs">{children}</div>
    </TabCtx.Provider>
  );
}

export function NavTab({ value, label }: { value: string; label: string }) {
  const ctx = useContext(TabCtx);
  const active = ctx.value === value;
  return (
    <button
      type="button"
      className={active ? "tab on" : "tab"}
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
