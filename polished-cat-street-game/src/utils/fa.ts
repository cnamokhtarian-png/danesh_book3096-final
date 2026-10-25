const nf = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("fa-IR", { month: "short", day: "numeric" });

/** Convert a number to Persian digits with the Persian thousands separator. */
export function faNum(value: number): string {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  try {
    return nf.format(safe);
  } catch {
    return String(safe).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
  }
}

export function faMeters(value: number): string {
  return `${faNum(value)} متر`;
}

export function faPercent(value: number): string {
  return `${faNum(value)}٪`;
}

export function faSeconds(value: number): string {
  return `${faNum(value)} ثانیه`;
}

/** Persian, human-friendly relative date for the local leaderboard. */
export function faDate(at: number): string {
  const delta = Date.now() - at;
  if (!Number.isFinite(delta) || delta < 0) return "همین حالا";
  if (delta < 60_000) return "همین حالا";
  if (delta < 3_600_000) return `${faNum(Math.floor(delta / 60_000))} دقیقه پیش`;
  if (delta < 86_400_000) return `${faNum(Math.floor(delta / 3_600_000))} ساعت پیش`;
  if (delta < 7 * 86_400_000) return `${faNum(Math.floor(delta / 86_400_000))} روز پیش`;
  try {
    return dateFmt.format(new Date(at));
  } catch {
    return "مدتی پیش";
  }
}
