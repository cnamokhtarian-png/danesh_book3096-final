"""خط فرمان ربات: check / once / run / status / report / panic / resume."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .broker import ExchangeError
from .config import ConfigError, Settings
from .db import Store
from .economics import analyze, explain
from .engine import Engine
from .guard import has_blocking_errors, preflight
from .util import FileLock, fmt_number, fmt_pct, setup_logging

ICONS = {True: "✅", False: "❌"}


def _load(args: argparse.Namespace) -> Settings:
    settings = Settings.from_env(env_file=args.env, use_dotenv=not args.no_env)
    register_logging(settings)
    return settings


def register_logging(settings: Settings) -> None:
    setup_logging(settings.log_level, settings.log_path)


def cmd_check(args: argparse.Namespace) -> int:
    settings = _load(args)
    print(f"بررسی تنظیمات و اتصال — {settings.exchange} / {settings.symbol}\n")
    checks = preflight(settings)
    for check in checks:
        prefix = ICONS[check.ok]
        if check.level == "warn" and check.ok:
            prefix = "⚠️"
        print(f"{prefix} {check.name}: {check.detail}")

    economics = analyze(
        settings.take_profit_pct,
        settings.stop_loss_pct,
        settings.fee_pct,
        settings.max_trades_per_day,
    )
    print("\nاقتصاد معامله (بدون پیش‌بینی سود؛ فقط ریاضی کارمزد):")
    for line in explain(economics):
        print(f"  • {line}")
    print(
        f"  • اگر سقف {settings.max_trades_per_day} معامله در روز پر شود، در بدترین حالت "
        f"حدود {economics.daily_fee_drag_pct:.1f}% از سرمایه صرف کارمزد می‌شود."
    )

    summary = settings.describe()
    print("\nخلاصه‌ی تنظیمات:")
    for key, value in summary.items():
        print(f"  {key}: {value}")

    if has_blocking_errors(checks):
        print("\n❌ موارد مسدودکننده وجود دارد؛ اجرای ربات در این وضعیت توصیه نمی‌شود.")
        return 1
    print("\n✅ همه‌ی بررسی‌های حیاتی موفق بودند.")
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    settings = _load(args)
    engine = Engine(settings)
    status = engine.status()
    print(f"وضعیت — {status['symbol']} ({status['exchange']}, {status['mode']})")
    price_text = (
        f"{fmt_number(status['price'])} {settings.quote_asset}"
        if status["price"] > 0
        else "در دسترس نیست (اتصال به صرافی برقرار نشد)"
    )
    print(f"  قیمت لحظه‌ای: {price_text}")
    print(f"  نقدینگی: {fmt_number(status['cash'])} {settings.quote_asset}")
    print(
        f"  موقعیت: {fmt_number(status['holdings'], 8)} {settings.base_asset} "
        f"(میانگین خرید {fmt_number(status['position_avg_price'])})"
    )
    print(f"  دارایی کل: {fmt_number(status['equity'])} {settings.quote_asset}")
    print(f"  تغییر امروز: {fmt_pct(status['daily_pnl_pct'])}")
    print(f"  معاملات امروز: {status['trades_today']}/{settings.max_trades_per_day}")
    print(f"  سوئیچ توقف: {'فعال ⛔' if status['kill_switch'] else 'خاموش ✅'}")
    return 0


def cmd_once(args: argparse.Namespace) -> int:
    settings = _load(args)
    engine = Engine(settings)
    engine.bootstrap()
    result = engine.run_cycle()
    decision = result.decision
    if decision:
        print(
            f"\nتصمیم: {decision.action.value} (اطمینان {decision.confidence:.2f}) — "
            f"{decision.reason}"
        )
    if result.executed:
        print("سفارش اجرا شد.")
    else:
        print("سفارشی اجرا نشد.")
    return 0


def cmd_run(args: argparse.Namespace) -> int:
    settings = _load(args)
    if settings.is_live and args.dry_run_live:
        print("حالت live ولی با آرگومان --dry-run-live: سفارش واقعی ثبت نمی‌شود.")
        settings.mode = "paper"

    lock_path = settings.state_dir / "trader.lock"
    try:
        with FileLock(lock_path):
            engine = Engine(settings)
            engine.run_forever()
    except RuntimeError as exc:
        print(f"❌ {exc}")
        return 1
    except KeyboardInterrupt:
        print("\n⏹ توقف دستی. وضعیت ذخیره شده است.")
    return 0


def cmd_report(args: argparse.Namespace) -> int:
    settings = _load(args)
    store = Store(settings.db_path)
    trades = store.recent_trades(args.limit)
    decisions = store.recent_decisions(args.limit)
    print(f"آخرین معاملات ({settings.mode}):")
    if not trades:
        print("  — معامله‌ای ثبت نشده است.")
    for trade in trades:
        print(
            f"  {trade['ts']} | {trade['side']:<4} | {trade['quantity']:.8f} "
            f"@ {fmt_number(trade['price'])} | ارزش {fmt_number(trade['quote_value'])} | "
            f"{trade['status']} | {trade['note'][:60]}"
        )
    print("\nآخرین تصمیم‌ها:")
    if not decisions:
        print("  — تصمیمی ثبت نشده است.")
    for decision in decisions:
        print(
            f"  {decision['ts']} | {decision['action']:<4} | {decision['status']:<8} | "
            f"{decision['source']:<10} | {decision['reason'][:70]}"
        )
    return 0


def cmd_panic(args: argparse.Namespace) -> int:
    settings = _load(args)
    settings.ensure_dirs()
    settings.kill_switch_path.write_text(
        "توقف اضطراری: برای ادامه این فایل را پاک کنید (یا دستور resume).\n", encoding="utf-8"
    )
    print(f"⛔ سوئیچ توقف ساخته شد: {settings.kill_switch_path}")
    print("ربات در چرخه‌ی بعدی هیچ سفارشی ثبت نمی‌کند.")
    return 0


def cmd_resume(args: argparse.Namespace) -> int:
    settings = _load(args)
    settings.kill_switch_path.unlink(missing_ok=True)
    print("✅ سوئیچ توقف برداشته شد.")
    return 0


def cmd_reset_paper(args: argparse.Namespace) -> int:
    settings = _load(args)
    if settings.is_live:
        print("❌ ریست فقط در حالت paper مجاز است.")
        return 1
    if not args.yes:
        answer = input("همه‌ی وضعیت و تاریخچه‌ی حالت کاغذی پاک شود؟ (yes/no) ").strip().lower()
        if answer not in {"yes", "y", "بله"}:
            print("لغو شد.")
            return 0
    for path in (settings.db_path, Path(str(settings.db_path) + "-wal"), Path(str(settings.db_path) + "-shm")):
        path.unlink(missing_ok=True)
    print("✅ وضعیت حالت کاغذی پاک شد.")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="trader",
        description="ربات معامله‌گر و مدیریت ریسک کریپتو (پیش‌فرض: حالت کاغذی)",
    )
    parser.add_argument("--env", help="مسیر فایل .env جایگزین", default=None)
    parser.add_argument("--no-env", action="store_true", help="خواندن .env را غیرفعال کن")
    sub = parser.add_subparsers(dest="command", required=True)

    check = sub.add_parser("check", help="بررسی تنظیمات، اتصال و داده‌ی بازار")
    check.set_defaults(func=cmd_check)

    once = sub.add_parser("once", help="یک چرخه‌ی کامل اجرا کن")
    once.set_defaults(func=cmd_once)

    run = sub.add_parser("run", help="اجرای مداوم ربات")
    run.add_argument(
        "--dry-run-live",
        action="store_true",
        help="اگر تنظیمات live بود، به‌صورت کاغذی اجرا کن",
    )
    run.set_defaults(func=cmd_run)

    status = sub.add_parser("status", help="نمایش وضعیت حساب و موقعیت")
    status.set_defaults(func=cmd_status)

    report = sub.add_parser("report", help="نمایش معاملات و تصمیم‌های اخیر")
    report.add_argument("--limit", type=int, default=10)
    report.set_defaults(func=cmd_report)

    panic = sub.add_parser("panic", help="ساخت سوئیچ توقف اضطراری")
    panic.set_defaults(func=cmd_panic)

    resume = sub.add_parser("resume", help="برداشتن سوئیچ توقف")
    resume.set_defaults(func=cmd_resume)

    reset = sub.add_parser("reset-paper", help="پاک کردن وضعیت حالت کاغذی")
    reset.add_argument("--yes", action="store_true")
    reset.set_defaults(func=cmd_reset_paper)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return int(args.func(args))
    except ConfigError as exc:
        print(f"❌ {exc}", file=sys.stderr)
        return 2
    except ExchangeError as exc:
        print(
            "❌ ارتباط با صرافی برقرار نشد.\n"
            f"   جزئیات: {exc}\n"
            "   • اینترنت/VPN را بررسی کنید\n"
            "   • اگر صرافی در دسترس نیست، بعداً دوباره امتحان کنید\n"
            "   • هیچ سفارشی ثبت نشد و پول شما دست‌نخورده است",
            file=sys.stderr,
        )
        return 3
    except KeyboardInterrupt:
        print("\n⏹ متوقف شد.")
        return 130


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
