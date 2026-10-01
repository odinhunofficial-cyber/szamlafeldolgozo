"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function InviteAcceptor() {
  const [accepted, setAccepted] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) return;

      const { data, error } = await supabase.rpc("accept_company_invite");

      if (error) {
        if (!error.message.includes("meg kell erősíteni")) {
          console.warn("A meghívó beváltása nem sikerült:", error.message);
        }
        return;
      }

      if (typeof data === "number" && data > 0) {
        setAccepted(data);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (accepted === 0) return null;

  return (
    <div className="container">
      <div className="msg ok">
        {accepted} cég hozzáférése megnyílt a könyvelői meghívó alapján.
      </div>
    </div>
  );
}
