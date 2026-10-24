"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { apiFetch } from "@/lib/api-client";

export default function BookOwnerActions({
  id,
  status,
}: {
  id: number;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"toggle" | "delete" | null>(null);
  const [error, setError] = useState("");

  const isExchanged = status === "exchanged";

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={pending !== null}
        onClick={async () => {
          setPending("toggle");
          setError("");
          const result = await apiFetch(`/api/books/${id}`, {
            method: "PATCH",
            body: { status: isExchanged ? "available" : "exchanged" },
          });
          setPending(null);
          if (!result.ok) {
            setError(result.message);
            return;
          }
          router.refresh();
        }}
        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11.5px] font-bold transition disabled:opacity-50 ${
          isExchanged
            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "bg-ink-50 text-ink-600 hover:bg-brand-50 hover:text-brand-700"
        }`}
      >
        <Icon name={isExchanged ? "check" : "exchange"} className="size-3.5" />
        {pending === "toggle" ? "…" : isExchanged ? "فعال‌سازی" : "مبادله شد"}
      </button>

      <button
        type="button"
        disabled={pending !== null}
        onClick={async () => {
          if (!window.confirm("این آگهی برای همیشه حذف شود؟")) return;
          setPending("delete");
          setError("");
          const result = await apiFetch(`/api/books/${id}`, { method: "DELETE" });
          setPending(null);
          if (!result.ok) {
            setError(result.message);
            return;
          }
          router.refresh();
        }}
        className="grid size-8 place-items-center rounded-xl text-ink-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
        title="حذف آگهی"
        aria-label="حذف آگهی"
      >
        <Icon name="trash" className="size-4" />
      </button>

      {error && <span className="text-[11px] font-bold text-rose-600">{error}</span>}
    </div>
  );
}
