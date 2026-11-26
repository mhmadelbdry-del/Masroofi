# MacroDroid bridge: setup (review draft, not deployed)

## What leaves the phone
`{"amount": "120.50", "occurredAt": 1764100000000}` and nothing else: the amount text as extracted on the phone and the time MacroDroid says the notification was posted. The server rejects any other field, so notification text, title, balance, card digits and app name cannot be stored even by mistake.

## Server side (only after the user approves merging; deployment is coordinated, no Vercel login by Instinct)
1. Merging the branch to GitHub `main` triggers the user's normal deploy. The build applies `migrations/0009_bank_bridge_devices.sql` (additive; 0008 is already taken by category removal).
2. In the app: Settings, section "ربط إشعارات البنك عبر MacroDroid". Enter a device name, pick the category, press create. The key is shown once, on the signed-in screen only.
3. Copy it and paste it into MacroDroid on the same phone. Never send it in a chat or to an AI. If lost, cancel it and create a new one.
4. "إلغاء" next to a device stops it at once. Up to 5 live devices per account.

## What the server enforces
Bearer token per device (only its SHA-256 is stored); JSON only; body max 512 bytes; amount 0.01 to 1,000,000 with at most 2 decimals, sent as text and normalized server-side (Arabic-Indic digits and Arabic separators accepted; "1.234" and "12,34" rejected, never guessed); notification time within 24 h past and 5 min future; 30 per hour and 200 per day per device; dedupe on device + cents + the notification post time in ms; enrolled user, household and member rechecked on every post (403 if they no longer match); category must still be active (409). The 401 answer is the same for missing, unknown and revoked tokens.
Failed-token throttle: 20 bad attempts per 10 minutes per caller address, then 429 (address stored only as a hash). The address comes only from Vercel's own headers and only when `VERCEL=1`. Vercel's request-headers documentation (https://vercel.com/docs/headers/request-headers) says it overwrites `X-Forwarded-For` and does not forward external IPs to prevent spoofing, and that `x-vercel-forwarded-for` and `x-real-ip` are identical to it. The code ignores `x-forwarded-for` and any client-supplied variant; off Vercel all callers share one bucket. The docs do not separately state overwrite behaviour for the other two headers beyond "identical", so this is documented-behaviour trust, not tested on a live Vercel deployment.

## The extraction recipe (reuses the app's own parser rules, tested)
MacroDroid's regex features cannot run the Java parser itself, so the same rules are expressed as three regexes. They were tested in Java regex against the real `BankSmsParser` on a synthetic corpus (`scripts/macrodroid-regex-parity/`, 38 cases). Result: identical output on 36; the other 2 (amount 0 and amount above 1,000,000) are rejected by the server instead. MacroDroid on Android uses the ICU regex engine, which accepts the same syntax used here, but that was not run on a phone: use each dialog's Test button before enabling.

Rules the regexes encode: needs a debit word; skipped if any of the app's exclusion words appear (OTP, refund, credited, transfer, cash-in, top-up, offers and so on, Arabic included); skipped if a foreign currency word appears; only text BEFORE the first balance word is searched, so a balance can never be recorded as the purchase; if two amounts appear before the balance, the notification is skipped as ambiguous; if the balance comes first, it is skipped. Arabic and Persian digits and separators are recognised. Egyptian pound forms: EGP, LE, E£, ج.م, جنيه.

Macro (free tier allows 5 macros):
1. Trigger: Notification Received. Select Applications: your bank/wallet app(s) only. Text filter mode "Matches", Enable regular expression matching ON, separate title/message OFF, regex:
```
(?is)^(?=.*(?:\b(?:purchase|purchased|paid|payment of|debited|spent)\b|(?:تم\s+)?(?:خصم|دفع)|شراء))(?!.*(?:\b(?:otp|verification|declined|failed|reversed|reversal|refunded|refund|credited|received|deposit|withdrawal|transfer|top.?up|recharge|cash.?in|due|outstanding|offer|discount|cashback|promotion|bonus)\b|رمز|كود|تحقق|مرفوض|فشل|إلغاء|الغاء|استرداد|إيداع|ايداع|إضافة|اضافة|تحويل|سحب|شحن|تغذية|مستحق|خصومات|عرض|عروض|استمتع|وفر|توفير|كاش\s*باك))(?!.*(?:\b(?:USD|EUR|GBP|SAR|AED)\b|دولار|يورو|ريال|درهم))(?=(?:(?!available|remaining|balance|الرصيد|رصيد|المتاح).)*?(?:(?:EGP|LE|E£|ج\.?\s?م\.?|جنيه(?:ا|اً)?)\s*(?:[0-9\u0660-\u0669\u06f0-\u06f9]{1,3}(?:[,\u066c][0-9\u0660-\u0669\u06f0-\u06f9]{3})+|[0-9\u0660-\u0669\u06f0-\u06f9]+)(?:[.\u066b][0-9\u0660-\u0669\u06f0-\u06f9]{1,2})?(?![0-9\u0660-\u0669\u06f0-\u06f9.,\u066b\u066c])|(?<![0-9\u0660-\u0669\u06f0-\u06f9.,\u066b\u066c])(?:[0-9\u0660-\u0669\u06f0-\u06f9]{1,3}(?:[,\u066c][0-9\u0660-\u0669\u06f0-\u06f9]{3})+|[0-9\u0660-\u0669\u06f0-\u06f9]+)(?:[.\u066b][0-9\u0660-\u0669\u06f0-\u06f9]{1,2})?\s*(?:EGP|LE|E£|ج\.?\s?م\.?|جنيه(?:ا|اً)?)))(?!(?:(?!available|remaining|balance|الرصيد|رصيد|المتاح).)*?(?:(?:EGP|LE|E£|ج\.?\s?م\.?|جنيه(?:ا|اً)?)\s*(?:[0-9\u0660-\u0669\u06f0-\u06f9]{1,3}(?:[,\u066c][0-9\u0660-\u0669\u06f0-\u06f9]{3})+|[0-9\u0660-\u0669\u06f0-\u06f9]+)(?:[.\u066b][0-9\u0660-\u0669\u06f0-\u06f9]{1,2})?(?![0-9\u0660-\u0669\u06f0-\u06f9.,\u066b\u066c])|(?<![0-9\u0660-\u0669\u06f0-\u06f9.,\u066b\u066c])(?:[0-9\u0660-\u0669\u06f0-\u06f9]{1,3}(?:[,\u066c][0-9\u0660-\u0669\u06f0-\u06f9]{3})+|[0-9\u0660-\u0669\u06f0-\u06f9]+)(?:[.\u066b][0-9\u0660-\u0669\u06f0-\u06f9]{1,2})?\s*(?:EGP|LE|E£|ج\.?\s?م\.?|جنيه(?:ا|اً)?))(?:(?!available|remaining|balance|الرصيد|رصيد|المتاح).)*?(?:(?:EGP|LE|E£|ج\.?\s?م\.?|جنيه(?:ا|اً)?)\s*(?:[0-9\u0660-\u0669\u06f0-\u06f9]{1,3}(?:[,\u066c][0-9\u0660-\u0669\u06f0-\u06f9]{3})+|[0-9\u0660-\u0669\u06f0-\u06f9]+)(?:[.\u066b][0-9\u0660-\u0669\u06f0-\u06f9]{1,2})?(?![0-9\u0660-\u0669\u06f0-\u06f9.,\u066b\u066c])|(?<![0-9\u0660-\u0669\u06f0-\u06f9.,\u066b\u066c])(?:[0-9\u0660-\u0669\u06f0-\u06f9]{1,3}(?:[,\u066c][0-9\u0660-\u0669\u06f0-\u06f9]{3})+|[0-9\u0660-\u0669\u06f0-\u06f9]+)(?:[.\u066b][0-9\u0660-\u0669\u06f0-\u06f9]{1,2})?\s*(?:EGP|LE|E£|ج\.?\s?م\.?|جنيه(?:ا|اً)?))).*$
```
2. Action: Set Variable (string) `amtA` = empty; Set Variable (string) `amtB` = empty. (So an old value can never be reused.)
3. Action: Text Manipulation, Extract text, source `{notification}`, return Group 1, into `amtA`, regex:
```
(?is)^(?:(?!available|remaining|balance|الرصيد|رصيد|المتاح).)*?(?:EGP|LE|E£|ج\.?\s?م\.?|جنيه(?:ا|اً)?)\s*((?:[0-9\u0660-\u0669\u06f0-\u06f9]{1,3}(?:[,\u066c][0-9\u0660-\u0669\u06f0-\u06f9]{3})+|[0-9\u0660-\u0669\u06f0-\u06f9]+)(?:[.\u066b][0-9\u0660-\u0669\u06f0-\u06f9]{1,2})?)(?![0-9\u0660-\u0669\u06f0-\u06f9.,\u066b\u066c])
```
4. Action: Text Manipulation, Extract text, source `{notification}`, return Group 1, into `amtB`, regex:
```
(?is)^(?:(?!available|remaining|balance|الرصيد|رصيد|المتاح).)*?(?<![0-9\u0660-\u0669\u06f0-\u06f9.,\u066b\u066c])((?:[0-9\u0660-\u0669\u06f0-\u06f9]{1,3}(?:[,\u066c][0-9\u0660-\u0669\u06f0-\u06f9]{3})+|[0-9\u0660-\u0669\u06f0-\u06f9]+)(?:[.\u066b][0-9\u0660-\u0669\u06f0-\u06f9]{1,2})?)\s*(?:EGP|LE|E£|ج\.?\s?م\.?|جنيه(?:ا|اً)?)
```
5. Action: Set Variable (string) `amt` = `{v=amtA}{v=amtB}`.
6. If `amt` is not empty: HTTP Request, POST, URL `https://masroofi-lac.vercel.app/api/bank-bridge`, headers `Authorization: Bearer <key pasted on the phone>` and `Content-Type: application/json`, body `{"amount": "{v=amt}", "occurredAt": {not_timestamp}}`. Leave "Allow any certificate" OFF.
Test only with a synthetic notification you send yourself, not a real purchase.

## Known limits
- Only `{notification}` (the message text) is read, not the title. If your bank puts the amount in the title, nothing fires.
- Not verified on a real phone: that the ICU engine and the Test button give the same results as the Java tests; that the bank app keeps the same `{not_timestamp}` when it re-posts a notification (if not, a duplicate could appear); that the Extract action leaves the variable empty on no match (step 2 guards this).
- Balance-first messages and ambiguous messages are skipped, not recorded. Expect some real purchases to be missed; the app's narrow parser has the same behaviour.
- MacroDroid needs Notification Access (a third party can see all notifications; the macro filter only limits what it reacts to). A bank that sends only SMS with no notification will not fire it.
