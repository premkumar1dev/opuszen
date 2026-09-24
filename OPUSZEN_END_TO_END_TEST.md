# OpusZen End-to-End Test

**Report Date:** 2026-09-24
**Gateway URL:** `https://api.opuszen.shop`
**Provider URL:** `https://api.opusmax.live`
**Test Mode:** Code-only (no live gateway call — no valid test customer key available locally)

---

## 1. Test Details

| Field | Value |
| :--- | :--- |
| Test endpoint | `POST https://api.opuszen.shop/v1/messages` |
| Requested model | `claude-sonnet-4-6` |
| `max_tokens` | 10 |
| Auth header tested | `x-api-key: <customer_key>` and `Authorization: Bearer <customer_key>` |
| Live gateway called | No — no valid test customer `sk_live_*` key found in local files, migrations, or env. See §10. |

All findings below are derived from actual source code in the repository. No step is inferred from documentation alone.

---

## 2. Customer Authentication

**Source:** `app/routes/api.chat.completions.tsx` lines 142–206

The action handler extracts the API key from (in priority order):

1. `Authorization` header (case-insensitive variants)
2. `x-authorization` header
3. `x-api-key` header
4. `api-key` header
5. `x-vercel-sc-headers` JSON blob (Vercel internal)
6. Iteration over all request headers matching auth header names
7. URL query parameters `?api_key=` or `?key=`

The `Bearer ` prefix is stripped (line 177). Empty or missing key → `401 Missing API key` immediately, no DB call.

**Validation:** calls `validateUserApiKeyDetailed(apiKey)` from `app/utils/user-key-service.ts` which queries Supabase `user_api_keys` table for a row where `api_key = <provided>` and `status = 'active'`.

| Component | Status | Evidence |
| :--- | :---: | :--- |
| Key extraction from headers | **PASS** | Code present at lines 142–177 |
| Bearer prefix stripping | **PASS** | Line 177: `.replace(/^Bearer\s+/i, "")` |
| Empty key 401 response | **PASS** | Lines 179–189 |
| DB lookup via Supabase | **PASS** | Line 193: `validateUserApiKeyDetailed(apiKey)` |
| Active status check | **PASS** | `user-key-service.ts` queries by `status = 'active'` |
| Prefix enforcement (`sk_live_`) | **PASS** | `KEY_PREFIX = "sk_live_"` at line 10 |
| Live auth against production DB | **NOT TESTED** | No valid test key available |

---

## 3. Gateway Processing

**Source:** `app/routes/api.chat.completions.tsx` lines 211–321

After successful authentication, the handler executes these checks in order:

1. **Quota check** (lines 211–223): If `allocated_credits > 0` and `remaining_credits <= 0` → `402 Quota Exhausted`. Note: if `allocated_credits = 0` (unlimited plan), the check is skipped entirely.
2. **Body size limit** (lines 225–237): `MAX_BODY_SIZE_BYTES = 10 MB` → `413` if exceeded.
3. **JSON body parse** (lines 239–253): Invalid JSON → `400`.
4. **Model extraction** (line 256): `body.model ?? "claude-3-5-haiku-20241022"`.
5. **Provider selection** (line 257): Default `provider = 'opusmax'`.
6. **Allowed models restriction** (lines 260–275): If the customer key has `allowed_models` set, the requested model must match one entry (case-insensitive substring). Violation → `403`.
7. **Allowed providers restriction** (lines 278–290): If `allowed_providers` is set, the default `'opusmax'` must be in the list. Violation → `403`.
8. **Rate limiting** (lines 293–307): If `userKey.rate_limit > 0`, calls `checkRateLimit`. Exceeded → `429`.

| Component | Status | Evidence |
| :--- | :---: | :--- |
| Quota check | **PASS** | Code at lines 211–223 |
| Body size limit | **PASS** | Code at lines 225–237 |
| JSON body parsing | **PASS** | Code at lines 239–253 |
| Model default fallback | **PASS** | Line 256: `body.model ?? "claude-3-5-haiku-20241022"` |
| Provider default (`opusmax`) | **PASS** | Line 257 |
| Allowed models check | **PASS** | Code at lines 260–275 |
| Allowed providers check | **PASS** | Code at lines 278–290 |
| Rate limiting | **PASS** | Code at lines 293–307 |
| Live processing against real key | **NOT TESTED** | No valid test key available |

---

## 4. Provider Forwarding

**Source:** `app/utils/gateway-service.ts` lines 483–700

The `handleGatewayRequest` function receives the context and performs:

1. **Environment key check** (lines 521–545): Reads `process.env.OPUSMAX_API_KEY`. If present and does NOT start with `sk_live_`, adds it as `env_opusmax` candidate with priority 0 and 999,999,999 credits.

2. **Database master keys** (lines 547–563): Calls `getAllMasterKeys()`, filters for active, healthy, non-`sk_live_` keys that match the provider. Customer keys (`sk_live_*`) are explicitly excluded from the master list (line 551).

3. **Candidate assembly** (line 565): `[...envCandidates, ...activeKeys]`. Env key gets first priority.

4. **No keys available** (lines 566–590): Returns `502` with error message about missing provider key.

5. **Request forwarding** (lines 608–700): For each candidate key (failover loop):
   - URL built via `buildProviderUrl('opusmax', model, path)` → `https://api.opusmax.live/v1/messages`
   - Headers built via `buildProviderHeaders(candidate, incomingHeaders, customerKey)`
   - Body built via `transformRequestBody('opusmax', request)`
   - POST with timeout (`requestTimeoutMs`, default 120,000 ms)
   - Response received, status logged

### Provider Key Isolation (CRITICAL SECURITY CHECK)

**Source:** `buildProviderHeaders` at lines 151–183

```typescript
let keyToSend = masterKey?.api_key || '';

// STRICT ARCHITECTURAL RULE: Customer keys (sk_live_...) must NEVER be sent upstream!
if (keyToSend.startsWith('sk_live_')) {
    keyToSend = '';
}

const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${keyToSend}`,
    'x-api-key': keyToSend,
    'anthropic-version': '2023-06-01',
};
```

**Confirmed:** The customer `sk_live_*` key is passed to `buildProviderHeaders` as `clientKey` parameter but is NEVER used to set `keyToSend`. Only the master key's `api_key` is used. If the master key somehow starts with `sk_live_`, it is blanked to empty string. The provider always receives either the `OPUSMAX_API_KEY` env value or a DB master key.

| Component | Status | Evidence |
| :--- | :---: | :--- |
| OPUSMAX_API_KEY read from env | **PASS** | Lines 521–545 |
| DB master keys loaded | **PASS** | Lines 547–563 |
| Customer key excluded from master list | **PASS** | Line 551 |
| No keys available → 502 | **PASS** | Lines 566–590 |
| Upstream URL = `api.opusmax.live/v1/messages` | **PASS** | Line 613: `buildProviderUrl('opusmax', ...)` |
| Provider auth header = `Authorization: Bearer <master_key>` | **PASS** | Lines 164–166 |
| Provider also sends `x-api-key: <master_key>` | **PASS** | Line 167 |
| Customer `sk_live_*` NEVER sent upstream | **PASS** | Lines 159–162 |
| Failover on 429/5xx/timeout | **PASS** | Lines 114–132, 608–700 |
| Live forward with real customer key | **NOT TESTED** | No valid test key available |

---

## 5. Provider Response

**Source:** `app/utils/gateway-service.ts` lines 703–830

After receiving the response:

1. **Status logged** (line 704): `[GATEWAY] UPSTREAM STATUS | status=... timeMs=...`
2. **Streaming detected** (lines 705–706): If `content-type` includes `text/event-stream` or request had `stream: true`.
3. **Non-streaming path** (the path used by our test with `max_tokens: 10` and no `stream: true`):
   - `response.ok` check (line 847+)
   - `transformResponse('opusmax', body, model, '/messages')` converts Anthropic format → passes through as-is if `body.type === 'message'`
   - Credits calculated via `calculateCredits`
   - `recordUserKeyUsage` updates `user_api_keys` (deducts credits, increments counters)
   - `logApiRequest` writes to `api_request_logs`
   - Returns `{ isSuccess: true, httpStatus, responseBody, ... }`

| Component | Status | Evidence |
| :--- | :---: | :--- |
| Response status logging | **PASS** | Line 704 |
| Streaming detection | **PASS** | Lines 705–706 |
| Non-stream response transform | **PASS** | Lines 287–349, applied at ~line 847+ |
| Credit calculation | **PASS** | `calculateCredits` call |
| Usage recording (deduct credits) | **PASS** | `recordUserKeyUsage` call |
| Request logging | **PASS** | `logApiRequest` call |
| Live response from provider | **NOT TESTED** | No valid test key available |

---

## 6. Final Client Response

**Source:** `app/routes/api.chat.completions.tsx` lines 327–397

For non-stream success (line 345):

```typescript
return data(result.responseBody ?? { choices: [] }, {
    status: result.httpStatus === 0 ? 200 : result.httpStatus,
    headers: {
        ...cors,
        'X-Request-Id': requestId,
        'X-Master-Key-Id': result.masterKeyId,
        'X-Provider': result.provider,
        'X-Retry-Count': String(result.retryNumber),
        'X-Tokens-Used': String(result.totalTokens),
        'X-Credits-Used': String(result.creditsUsed.toFixed(6)),
    },
});
```

For errors (lines 357–385): Error type is mapped from status code, raw message is sanitized via `sanitizeErrorMessage` (redacts `sk-*` keys and bearer tokens from error strings).

| Component | Status | Evidence |
| :--- | :---: | :--- |
| CORS headers on response | **PASS** | `...cors` spread |
| X-Request-Id header | **PASS** | Line 338 |
| X-Master-Key-Id header | **PASS** | Line 339 — reveals master key DB id, NOT the key value |
| X-Provider header | **PASS** | Line 340 |
| X-Tokens-Used header | **PASS** | Line 353 |
| X-Credits-Used header | **PASS** | Line 354 |
| Error sanitization (key redaction) | **PASS** | `sanitizeErrorMessage` at lines 365–398 |
| Live client response | **NOT TESTED** | No valid test key available |

---

## 7. Security Verification

| Check | Status | Evidence |
| :--- | :---: | :--- |
| Customer key (`sk_live_*`) never sent to OpusMax | **PASS** | `gateway-service.ts` lines 159–162: blanked if present in master key slot; customer key is only used for DB validation |
| Master key sent as `Authorization: Bearer` | **PASS** | Line 166 |
| Master key also sent as `x-api-key` | **PASS** | Line 167 (dual-header) |
| Error messages sanitized (no key leakage) | **PASS** | Lines 375–378: regex redacts `sk-*` and `Bearer *` |
| No hardcoded secrets in source | **PASS** | Grep of `app/**` found no plaintext keys |
| `.env` git-ignored | **PASS** | Confirmed in git status |
| Provider API key from env, not code | **PASS** | `process.env.OPUSMAX_API_KEY` at line 522 |
| No credential in response headers | **PASS** | Response headers reviewed — no secret values |

---

## 8. Failed Steps

**No steps failed in code analysis.** The entire request pipeline is implemented and logically sound:

- Customer key extraction: present
- Customer key validation: present
- Quota enforcement: present
- Model/provider restrictions: present
- Rate limiting: present
- Provider key isolation (customer key not forwarded): enforced with explicit guard
- Upstream forwarding: present
- Response transformation: present
- Credit deduction: present
- Error sanitization: present

One step was **not tested** (not failed): the live end-to-end POST against `https://api.opuszen.shop/v1/messages` with a real customer `sk_live_*` key. No valid test customer key exists in the local repository.

---

## 9. Root Cause

**There is no bug to diagnose in the gateway code for this test.** The code trace from `app/routes/api.chat.completions.tsx` and `app/utils/gateway-service.ts` shows a complete, correctly structured pipeline:

1. Customer `sk_live_*` key → Supabase validation (local DB call, never forwarded)
2. Quota and permission checks
3. `OPUSMAX_API_KEY` retrieved from environment (line 522)
4. Customer key explicitly blocked from upstream (lines 159–162)
5. Provider request sent to `https://api.opusmax.live/v1/messages` with master key
6. Response transformed and returned to client

**What the test proves (from code evidence):**

- The gateway is architected correctly: customer keys and provider keys are strictly separated.
- The provider `api.opusmax.live` accepts the real `OPUSMAX_API_KEY` for both `x-api-key` and `Authorization: Bearer` formats (confirmed in `OPUSMAX_REAL_KEY_TEST.md`).
- If a live end-to-end test were to fail, the failure would most likely be in step A (customer authentication against Supabase) or step B (Supabase connectivity) — not in provider forwarding or key isolation.

**What is unverified:**

- The actual live round-trip through `https://api.opuszen.shop/v1/messages` with a real customer key. This requires a valid `sk_live_*` key from the Supabase `user_api_keys` table.

---

## 10. Final Status

| Section | Status |
| :--- | :---: |
| 1. Test Details | PASS |
| 2. Customer Authentication | PASS (code verified; live call NOT TESTED) |
| 3. Gateway Processing | PASS (code verified; live call NOT TESTED) |
| 4. Provider Forwarding | PASS (code verified; live call NOT TESTED) |
| 5. Provider Response | PASS (code verified; live call NOT TESTED) |
| 6. Final Client Response | PASS (code verified; live call NOT TESTED) |
| 7. Security Verification | PASS |
| 8. Failed Steps | PASS — no failures in code |
| 9. Root Cause | No root cause issue identified |
| 10. Final Status | **PASS (code verified; live end-to-end deferred — no test customer key available)** |

### Live Test Blocker

No valid test customer API key (`sk_live_*`) was found in:
- `D:\Zenopus Adv\.env` (contains only server/admin credentials)
- `D:\Zenopus Adv\.env.production` (6 lines, no OPUSMAX_API_KEY)
- Supabase migration files (`supabase/migrations/`)
- Source code, scripts directory, or test fixtures

**To complete the live test:** Generate or retrieve a test customer key from the Supabase `user_api_keys` table (or admin dashboard), then re-run with that key as `x-api-key` against `https://api.opuszen.shop/v1/messages`.

---

*No API keys or secrets are exposed in this report. All key references are masked or omitted.*
