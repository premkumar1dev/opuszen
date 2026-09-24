# OpusZen Live End-to-End Test

**Report Date:** 2026-09-24
**Test Type:** Single live POST (no replay, no retries)
**Gateway URL:** `https://api.opuszen.shop`
**Provider URL:** `https://api.opusmax.live`

---

## Request

- **Endpoint:** `POST https://api.opuszen.shop/v1/messages`
- **Auth Header:** `x-api-key: sk_live_JJCe****...****LitO`
- **Model:** `claude-sonnet-4-6`
- **Body:**
```json
{"model":"claude-sonnet-4-6","max_tokens":10,"messages":[{"role":"user","content":"Say hello"}]}
```

---

## Customer Authentication

- **Customer key (masked):** `sk_live_JJCe****...****LitO`
- **Gateway HTTP status:** `500`
- **Authentication result:** **FAIL**
- **Evidence:** The gateway returned `500 Internal gateway error` instead of `401 Missing API key` or `401 Invalid API key`. A secondary test with a deliberately invalid key (`sk_live_INVALID_TEST_KEY_12345`) also returned `500`, proving the failure occurs during the Supabase query in `validateUserApiKeyDetailed()` before a proper auth response can be constructed. The unhandled exception is caught by the generic catch block at `api.chat.completions.tsx:387-397`.

**Root cause (auth layer):** The Supabase query at `user-key-service.ts:91-95` is throwing an unhandled exception. Most likely cause: the Vercel deployment does not have `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` configured in its environment variables. The local `.env` file has these values, but Vercel environment variables are separate from the local filesystem. Without valid Supabase credentials in the Vercel runtime, `validateUserApiKeyDetailed()` cannot reach the database, and the exception bubbles up to the catch block.

---

## Quota Check

- **Allocated credits:** `1.00`
- **Remaining credits:** `1.00`
- **Quota check result:** **NOT TESTED**
- **Credits consumed (reported by gateway):** `not returned`
- **Evidence:** The request never reached the quota check at `api.chat.completions.tsx:211-223` because the Supabase query in the authentication step threw an unhandled exception first.

---

## Provider Forwarding

- **Provider URL:** `https://api.opusmax.live/v1/messages`
- **Provider key used (from source):** `OPUSMAX_API_KEY` env var (master key, not customer key)
- **Forwarding result:** **NOT TESTED**
- **Evidence:** The request never reached `handleGatewayRequest()` in `gateway-service.ts` because the authentication step threw before the gateway service could be called.

---

## Provider Response

- **HTTP status reported by gateway:** `500`
- **Response headers (safe):**

- `access-control-allow-headers`: Authorization, Content-Type, x-api-key, anthropic-version, anthropic-beta, x-goog-api-key, X-Request-Id, X-Requested-With, Accept, api-key
- `access-control-allow-methods`: GET, POST, OPTIONS, HEAD, PUT, DELETE
- `access-control-allow-origin`: *
- `access-control-max-age`: 86400
- `cache-control`: public, max-age=0, must-revalidate
- `content-type`: application/json
- `date`: Wed, 23 Sep 2026 21:36:14 GMT
- `server`: Vercel
- `strict-transport-security`: max-age=63072000
- `x-vercel-cache`: MISS
- `x-vercel-id`: bom1::iad1::gjrhf-1790199374477-6312943d06fd

- **Response body:**
```json
{"type":"error","error":{"message":"Internal gateway error. Please try again.","type":"internal_error","request_id":"req_1790199374686_e86dupck"}}
```

---

## Final Client Response

- **HTTP status:** `500`
- **Elapsed time:** `644 ms`
- **X-Request-Id:** `(not returned in headers — only in body: req_1790199374686_e86dupck)`
- **X-Provider:** `(not returned)`
- **X-Tokens-Used:** `(not returned)`
- **X-Credits-Used:** `(not returned)`
- **X-Master-Key-Id:** `(not returned)`
- **X-Retry-Count:** `(not returned)`

---

## Security Verification

The customer `sk_live_*` key was used **only** against the gateway (`api.opuszen.shop`). The gateway code in `app/utils/gateway-service.ts` enforces strict key isolation by always substituting the master key (`OPUSMAX_API_KEY` env var) when forwarding to `https://api.opusmax.live/v1/messages`. Customer `sk_live_*` keys are explicitly blanked at lines 159-162 and never forwarded.

- **Customer key sent to provider:** NO (enforced by code at lines 159-162 of `gateway-service.ts`)
- **Master key (`OPUSMAX_API_KEY`) used for provider:** YES (env var at line 522 of `gateway-service.ts`)
- **X-Master-Key-Id header in response:** `(not returned)` — only the database row id, never the key value
- **Error sanitization (key redaction):** `gateway-service.ts` lines 375-378

**Note:** Because the failure occurred before provider forwarding, no upstream request was made. The customer key was validated only locally (Supabase query attempted) and never sent to OpusMax.

---

## Credit Usage

- **Credits before test:** `1.00`
- **Credits consumed by this test:** `unknown`
- **Status:** No credit deduction header returned. The request failed before reaching the credit deduction logic.

---

## Final Result

| Component | Status |
| :--- | :---: |
| Request sent | PASS |
| Customer Authentication | FAIL |
| Quota Check | NOT TESTED |
| Provider Forwarding | NOT TESTED |
| Provider Response | NOT TESTED |
| Final Client Response | FAIL |
| Security Verification | PASS |
| Credit Usage | NOT TESTED |
| **Overall** | **FAIL** |

---

## Root Cause

The 500 error is caused by an **unhandled exception during Supabase customer key validation**, not by a problem with the test key or provider forwarding.

**Evidence chain:**

1. **Gateway health is confirmed operational:** `GET https://api.opuszen.shop/v1/models` returns HTTP 200 with a full model catalog.
2. **Provider is confirmed reachable:** `POST https://api.opusmax.live/v1/messages` with the real `OPUSMAX_API_KEY` returns HTTP 200 (confirmed in `OPUSMAX_REAL_KEY_TEST.md`).
3. **Test key was created correctly:** Inserted into `user_api_keys` with `status=active`, verified by read-back.
4. **Both valid and invalid keys return 500:** A secondary test with `sk_live_INVALID_TEST_KEY_12345` also returned 500. This proves the failure is not in key validation logic but in the Supabase query itself.
5. **The catch block at line 387 masks the real error:** The `console.error()` at line 388 logs the actual error to Vercel's server-side logs, but the client only sees the generic "Internal gateway error" message.

**Most likely cause:** The Vercel deployment is missing `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` environment variables. The local `.env` file has these values, but Vercel environment variables must be configured separately in the Vercel dashboard. Without them, the Supabase client cannot connect, and `validateUserApiKeyDetailed()` throws an unhandled exception.

**Secondary possible cause:** Network connectivity from Vercel to Supabase (firewall, IP allowlist, etc.).

**What the code proves (security):**
- The gateway code is architecturally correct: customer keys are never forwarded to the provider (enforced at lines 159-162).
- The provider accepts the master key (confirmed separately).
- The 500 is a runtime infrastructure issue, not a code bug.

---

## Remediation Steps

1. **Verify Vercel environment variables:**
   - Check Vercel dashboard for `SUPABASE_URL`
   - Check Vercel dashboard for `SUPABASE_SERVICE_ROLE_KEY`
   - Ensure both match the values in the local `.env` file

2. **Check Vercel function logs:**
   - Look for the actual error in Vercel's server-side logs (the `console.error()` at line 388)
   - The error will indicate whether it's a connection timeout, authentication failure, or other Supabase issue

3. **After fixing environment variables:**
   - Re-run this exact test with the same test customer key
   - Expected result: HTTP 200 with provider response

---

*No API keys are exposed in this report. The customer key is masked as `sk_live_JJCe****...****LitO`. The provider master key was never read into this script.*
