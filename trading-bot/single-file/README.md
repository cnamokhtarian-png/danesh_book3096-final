# نسخهٔ تک‌فایلی (ویندوز) — بدون دانلود پوشه، بدون pip

این پوشه برای کسی است که نمی‌تواند بستهٔ zip را دانلود کند یا نمی‌خواهد چیزی نصب کند.

## فایل‌ها

| فایل | کار |
|---|---|
| `danesh_bot.py` | کل ربات در یک فایل، فقط با کتابخانه‌های استاندارد پایتون |
| `run.bat` | دوبار کلیک → ساخت تنظیمات (بار اول) و شروع ربات |
| `demo.bat` | دوبار کلیک → نمایش نمونه‌ی کارکرد، بدون اینترنت |
| `stop.bat` | دوبار کلیک → توقف اضطراری |

## راه‌اندازی (۳ قدم)

1. پوشه‌ای بسازید (مثلاً روی Desktop با نام `bot`).
2. `danesh_bot.py` را در آن ذخیره کنید:
   - Notepad را باز کنید، محتوای فایل را Paste کنید،
   - **File → Save As**، نوع فایل را **All Files** بگذارید،
   - نام: `danesh_bot.py` (حتماً `.py`، نه `.txt`)، Encoding: **UTF-8**.
   - `run.bat` را هم به همین شکل با نام `run.bat` ذخیره کنید (نوع: All Files).
3. روی `run.bat` دوبار کلیک کنید. اولین بار `bot.env` با حالت **تمرینی** ساخته
   می‌شود و ربات شروع می‌کند.

## دستورها

```bat
python danesh_bot.py demo      :: نمونه‌ی کارکرد، بدون اینترنت
python danesh_bot.py selftest  :: آزمون سلامت کد (برای اطمینان از درست‌بودن کپی)
python danesh_bot.py check     :: بررسی تنظیمات و اتصال (سفارش نمی‌دهد)
python danesh_bot.py status    :: وضعیت حساب و موقعیت
python danesh_bot.py once      :: یک چرخه
python danesh_bot.py run       :: اجرای مداوم
python danesh_bot.py panic     :: توقف اضطراری
```

## تنظیمات (`bot.env`)

با Notepad باز کنید. مهم‌ترین‌ها:

```ini
MODE=paper                 # paper = تمرینی | live = پول واقعی
SYMBOL=BTCIRT
NOBITEX_TOKEN=             # کلید API (فقط برای live)
CONFIRM=                   # برای live: I-UNDERSTAND-THE-RISK
MAX_POSITION_PCT=3         # سقف هر خرید نسبت به کل دارایی
STOP_LOSS_PCT=2.5          # حد ضرر
TAKE_PROFIT_PCT=5          # حد سود
MAX_TRADES_PER_DAY=4       # سقف معاملات روز
MAX_DAILY_LOSS_PCT=2       # بعد از این افت، خرید متوقف می‌شود
```

برای معامله‌ی واقعی، هر سه مورد لازم است: `MODE=live`، `NOBITEX_TOKEN`،
`CONFIRM=I-UNDERSTAND-THE-RISK`. کلید را با مجوز **Read + Trade** و **بدون
Withdrawal** بسازید.

## تفاوت با نسخهٔ کامل

نسخهٔ تک‌فایلی فقط نوبیتکس را پشتیبانی می‌کند و گزارش‌ها را در `bot.log` و
(اختیاری) تلگرام می‌نویسد. نسخهٔ کامل (پوشهٔ `trader/`) والکس، دیتابیس SQLite،
هوش مصنوعی و دستیار راه‌اندازی هم دارد.
