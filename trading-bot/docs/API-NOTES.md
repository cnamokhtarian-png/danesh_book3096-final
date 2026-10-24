# یادداشت‌های API صرافی‌ها

این فایل خلاصه‌ی اندپوینت‌هایی است که کد استفاده می‌کند و نکات دام‌گونه‌ی هر
صرافی. پیش از تغییر کد، مستندات رسمی را دوباره ببینید؛ صرافی‌ها اندپوینت‌ها را
جابه‌جا می‌کنند.

## نوبیتکس

مستندات: <https://apidocs.nobitex.ir>

| کار | درخواست |
|---|---|
| دفتر سفارش | `GET https://apiv2.nobitex.ir/v3/orderbook/BTCIRT` |
| آمار بازار | `GET https://apiv2.nobitex.ir/market/stats?srcCurrency=btc&dstCurrency=rls` |
| کندل | `GET https://apiv2.nobitex.ir/market/ohlc?symbol=BTCIRT&resolution=5&from=…&to=…` |
| کیف پول‌ها | `POST https://apiv2.nobitex.ir/users/wallets/list` |
| ثبت سفارش | `POST https://apiv2.nobitex.ir/market/orders/add` |
| وضعیت سفارش | `POST https://apiv2.nobitex.ir/market/orders/status` |
| لغو | `POST https://apiv2.nobitex.ir/market/orders/update-status` |

نمونه‌ی ثبت سفارش خرید:

```json
{
  "type": "buy",
  "execution": "limit",
  "srcCurrency": "btc",
  "dstCurrency": "rls",
  "amount": "0.0005",
  "price": "6000000000",
  "clientOrderId": "dt-xxxxxxxx"
}
```

نکات:

- **واحد پول: ریال.** قیمت‌ها در API ریالی‌اند. این ربات همه‌چیز را به تومان
  نرمال می‌کند (`_quote_scale = 0.1`) و هنگام ثبت سفارش دوباره ریالی می‌فرستد.
- `dstCurrency` برای بازارهای تومانی `rls` است (نه `irt`).
- `amount` برای سفارش limit در واحد ارز پایه (مثلاً BTC) است. برای خرید market،
  مقدار در واحد ارز مظنه است — این ربات از market استفاده نمی‌کند.
- پاسخ موفق: `{"status":"ok","order":{"id":…,"status":"Open"}}`؛ خطاها با
  `status: "failed"` و `code` برمی‌گردند (`InvalidMarketPair`، `InvalidAmount`، …).
- محدودیت نرخ: حدود ۳۰۰ درخواست در دقیقه برای داده‌ی عمومی و حدود ۳۰۰ در هر
  ۱۰ دقیقه برای ثبت سفارش. چرخه‌ی پیش‌فرض (۵ دقیقه، ۲ درخواست) بسیار پایین‌تر است.
- احراز هویت با هدر `Authorization: Token <TOKEN>`.
- کندل‌ها ممکن است کندل ناقص داشته باشند؛ ربات کندل‌های ناقص با قیمت صفر را حذف
  می‌کند.

## والکس

مستندات: <https://developers.wallex.ir> (نسخه‌ی قدیمی‌تر: <https://api-docs.wallex.ir>)

| کار | درخواست |
|---|---|
| بازارها/آمار | `GET https://api.wallex.ir/v1/markets?symbol=BTCUSDT` |
| کندل (UDF) | `GET https://api.wallex.ir/v1/udf/history?symbol=BTCUSDT&resolution=5&from=…&to=…` |
| موجودی | `GET https://api.wallex.ir/v1/account/balances` |
| ثبت سفارش | `POST https://api.wallex.ir/v1/account/orders` |
| جزئیات سفارش | `GET https://api.wallex.ir/v1/account/orders/{clientOrderId}` |
| لغو | `DELETE https://api.wallex.ir/v1/account/orders?clientOrderId=…` |

نمونه‌ی ثبت سفارش:

```json
{
  "client_id": "dt_xxxxxxxx",
  "price": "600000000",
  "quantity": "0.0005",
  "side": "BUY",
  "symbol": "BTCIRT",
  "type": "LIMIT"
}
```

نکات:

- احراز هویت: هدر `x-api-key`. (مستندات قدیمی‌تر برای برخی سرویس‌ها از
  `X-Api-Key` + توکن Bearer استفاده می‌کردند؛ این ربات فقط کلید اسپات را می‌فرستد.)
- قیمت بازارهای IRT در والکس **تومانی** است؛ ضریب ۱.
- `type` یکی از `LIMIT | MARKET | STOP_LIMIT | STOP_MARKET` است.
- `client_id` فقط حروف بزرگ/کوچک، عدد و `_` می‌پذیرد — به همین دلیل شناسه‌ها با
  `dt_` و هگز ساخته می‌شوند (در نوبیتکس `dt-`).
- محدودیت: حداکثر ۲۰ درخواست ثبت سفارش در هر ۱۰ ثانیه (ربات به‌مراتب کمتر).
- ساختار پاسخ‌ها در نسخه‌های مختلف کمی متفاوت است؛ کد با `pick()` چند کلید
  ممکن را امتحان می‌کند و اگر فیلدی نبود، خطای فارسی می‌دهد.

## توصیه‌ی نگهداری

- اندپوینت‌ها در `trader/broker/nobitex.py` و `wallex.py` متمرکزند؛ تغییر صرافی
  فقط همان دو فایل (به‌علاوه‌ی `broker/__init__.py`) را لازم دارد.
- هر تغییر را با `python -m trader check` روی حالت `paper` بسنجید.
- تست‌های `tests/test_brokers.py` نمونه‌های واقعی پاسخ را شبیه‌سازی می‌کنند؛ با
  تغییر API، همان تست‌ها را به‌روز کنید.
