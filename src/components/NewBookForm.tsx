"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Alert, Field } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import {
  CATEGORIES,
  CONDITIONS,
  EMOJI_CHOICES,
  KINDS,
  OFFER_TYPES,
  UNIVERSITIES,
  mediumOfKind,
} from "@/lib/constants";

export default function NewBookForm({ defaultUniversity }: { defaultUniversity?: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    kind: "book",
    offerType: "sell",
    audience: "general",
    course: "",
    author: "",
    university: defaultUniversity ?? "",
    category: "engineering",
    condition: "good",
    price: "",
    // پیش‌فرض خاموش است تا برچسب «قابل تبادل» فقط روی آگهی‌هایی بنشیند که
    // صاحب آگهی واقعاً آن را انتخاب کرده است.
    isExchangeable: false,
    description: "",
    coverEmoji: "📘",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setPending(true);

        const result = await apiFetch("/api/books", {
          method: "POST",
          body: {
            ...form,
            medium: mediumOfKind(form.kind),
            price:
              form.offerType === "free" || form.offerType === "request"
                ? 0
                : Number(form.price || 0),
          },
        });

        if (!result.ok) {
          setPending(false);
          setError(result.message);
          return;
        }
        router.refresh();
        router.push("/dashboard");
      }}
    >
      <div className="card-surface space-y-4 p-5">
        <Field label="عنوان آگهی">
          <input
            value={form.title}
            onChange={(event) => set("title", event.target.value)}
            className="field-base"
            placeholder="مثلاً کتاب مدارهای الکتریکی — نلسون"
            required
          />
        </Field>

        <Field label="نوع محتوا">
          <div className="grid gap-2 sm:grid-cols-2">
            {KINDS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  set("kind", item.value);
                  set("coverEmoji", item.emoji);
                  if (item.medium === "digital" && form.offerType === "sell") set("offerType", "free");
                  if (item.medium === "physical" && form.offerType === "free") set("offerType", "sell");
                }}
                className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-[13px] font-bold transition ${
                  form.kind === item.value
                    ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                    : "border-ink-100 bg-white text-ink-500 hover:border-brand-200"
                }`}
              >
                <span className="text-lg">{item.emoji}</span>
                {item.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نوع معامله">
            <div className="grid grid-cols-2 gap-2">
              {OFFER_TYPES.map((offer) => (
                <button
                  key={offer.value}
                  type="button"
                  onClick={() => set("offerType", offer.value)}
                  className={`flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-[12px] font-bold transition ${
                    form.offerType === offer.value
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-ink-100 bg-white text-ink-500 hover:border-brand-200"
                  }`}
                >
                  <span>{offer.emoji}</span>
                  {offer.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="مخاطب آگهی">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => set("audience", "general")}
                className={`flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-[12px] font-bold transition ${
                  form.audience === "general"
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-ink-100 bg-white text-ink-500 hover:border-brand-200"
                }`}
              >
                🎓 عمومی دانشگاهی
              </button>
              <button
                type="button"
                onClick={() => set("audience", "konkur")}
                className={`flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-[12px] font-bold transition ${
                  form.audience === "konkur"
                    ? "border-[#7c3aed] bg-[#f5efff] text-[#5b21b6]"
                    : "border-ink-100 bg-white text-ink-500 hover:border-[#c4b5fd]"
                }`}
              >
                👑 ویژه کنکور
              </button>
            </div>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="درس مرتبط" hint="اختیاری">
            <input
              value={form.course}
              onChange={(event) => set("course", event.target.value)}
              className="field-base"
              placeholder="مثلاً ریاضی عمومی ۲"
            />
          </Field>
          <Field label="نویسنده / استاد" hint="اختیاری">
            <input
              value={form.author}
              onChange={(event) => set("author", event.target.value)}
              className="field-base"
              placeholder="مثلاً پروفسور رودن"
            />
          </Field>
          <Field label="دانشگاه">
            <select
              value={form.university}
              onChange={(event) => set("university", event.target.value)}
              className="field-base"
            >
              <option value="">انتخاب کنید…</option>
              {UNIVERSITIES.map((university) => (
                <option key={university} value={university}>
                  {university}
                </option>
              ))}
            </select>
          </Field>
          <Field label="دسته‌بندی">
            <select
              value={form.category}
              onChange={(event) => set("category", event.target.value)}
              className="field-base"
            >
              {CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="وضعیت">
            <select
              value={form.condition}
              onChange={(event) => set("condition", event.target.value)}
              className="field-base"
            >
              {CONDITIONS.map((condition) => (
                <option key={condition.value} value={condition.value}>
                  {condition.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="قیمت (تومان)" hint="۰ = رایگان">
            <input
              value={form.price}
              onChange={(event) => set("price", event.target.value.replace(/[^\d]/g, ""))}
              className="field-base text-left"
              dir="ltr"
              inputMode="numeric"
              placeholder="0"
            />
          </Field>
        </div>

        <Field label="توضیحات" hint="اختیاری">
          <textarea
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            rows={4}
            maxLength={1200}
            className="field-base resize-none leading-7"
            placeholder="وضعیت صفحات، ویرایش کتاب، نیم‌سال درسی یا هر نکته‌ای که برای دانشجوی بعدی مفید است…"
          />
        </Field>
      </div>

      <div className="card-surface space-y-4 p-5">
        <Field label="آیکون آگهی">
          <div className="flex flex-wrap gap-2">
            {EMOJI_CHOICES.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => set("coverEmoji", emoji)}
                className={`grid size-11 place-items-center rounded-2xl border text-xl transition ${
                  form.coverEmoji === emoji
                    ? "border-brand-500 bg-brand-50 shadow-sm"
                    : "border-ink-100 bg-white hover:border-brand-200"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </Field>

        <button
          type="button"
          role="switch"
          aria-checked={form.isExchangeable}
          onClick={() => set("isExchangeable", !form.isExchangeable)}
          onKeyDown={(event) => {
            if (event.key === " " || event.key === "Enter") {
              event.preventDefault();
              set("isExchangeable", !form.isExchangeable);
            }
          }}
          className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-right transition ${
            form.isExchangeable
              ? "border-brand-200 bg-brand-50/70"
              : "border-ink-100 bg-white"
          }`}
        >
          <span>
            <span className="block text-[13px] font-bold text-ink-900">
              امکان تبادل / امانت‌گیری
            </span>
            <span className="mt-0.5 block text-[11.5px] text-ink-400">
              دانشجویان می‌توانند به‌جای پرداخت پول، کتاب یا جزوه خودشان را پیشنهاد دهند.
            </span>
          </span>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              form.isExchangeable ? "bg-brand-600" : "bg-ink-100"
            }`}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                form.isExchangeable ? "right-0.5" : "right-5.5"
              }`}
            />
          </span>
        </button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-brand-700 via-brand-600 to-brand-500 px-4 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-brand-500/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "در حال انتشار…" : "انتشار آگهی"}
        {!pending && <Icon name="sparkles" className="size-4.5" />}
      </button>
    </form>
  );
}
