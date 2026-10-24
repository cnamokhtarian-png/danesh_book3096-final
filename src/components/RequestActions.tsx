"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { apiFetch } from "@/lib/api-client";

export default function RequestActions({ id }: { id: number }) {
  const router = useRouter();
  const [pending, setPending] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState("");

  const run = async (action: "accept" | "decline") => {
    setPending(action);
    setError("");
    const result = await apiFetch("/api/requests", { method: "PATCH", body: { id, action } });
    setPending(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => run("accept")}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-[11.5px] font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50"
        >
          <Icon name="check" className="size-3.5" />
          {pending === "accept" ? "…" : "پذیرش"}
        </button>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => run("decline")}
          className="rounded-xl border border-ink-100 px-3 py-1.5 text-[11.5px] font-bold text-ink-500 transition hover:border-rose-200 hover:text-rose-600 disabled:opacity-50"
        >
          {pending === "decline" ? "…" : "رد"}
        </button>
      </div>
      {error && <span className="text-[11px] font-bold text-rose-600">{error}</span>}
    </div>
  );
}
