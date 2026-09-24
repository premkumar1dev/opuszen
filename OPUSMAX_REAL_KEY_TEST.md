# OpusMax Real Provider Key Test

**Report Date:** 2026-09-24
**Provider URL:** `https://api.opusmax.live`
**Key Used:** `sk-ant-o...FGuiVn` (masked)
**Model Requested:** `claude-sonnet-4-6`

---

## Test 1 - x-api-key

- **Auth Header:** `x-api-key: sk-ant-o...FGuiVn`
- **Status:** `200`
- **Authentication:** Accepted
- **Response Body:**

```json
{"id":"msg_0117jlwQyR7c9tCVMaKIMQdJAkp","type":"message","role":"assistant","content":[{"type":"thinking","thinking":"The user just said \"Say hello\" - a","signature":"2b57ed7afbeb430cb251e3df1ad7a6c2"}],"model":"claude-sonnet-4-6","stop_reason":"max_tokens","stop_sequence":null,"usage":{"input_tokens":2,"output_tokens":10,"cache_creation_input_tokens":0,"cache_read_input_tokens":0}}
```

- **Response Headers:**

- `date`: Wed, 23 Sep 2026 21:22:52 GMT
- `content-type`: application/json; charset=utf-8
- `x-request-id`: req_011aVHBWRYwdwNtX5e94CuIioQs
- `server`: cloudflare

- **Conclusion:** Provider accepted `x-api-key` header authentication. Request was processed successfully.

---

## Test 2 - Authorization Bearer

- **Auth Header:** `Authorization: Bearer sk-ant-o...FGuiVn`
- **Status:** `200`
- **Authentication:** Accepted
- **Response Body:**

```json
{"id":"msg_011kUV2H9mp6pFAZFQVy2P5wtAX","type":"message","role":"assistant","content":[{"type":"thinking","thinking":"The user just said \"Say hello\" - a","signature":"36deff6984ba4ebbba8e64475c469bb9"}],"model":"claude-sonnet-4-6","stop_reason":"max_tokens","stop_sequence":null,"usage":{"input_tokens":2,"output_tokens":10,"cache_creation_input_tokens":0,"cache_read_input_tokens":0}}
```

- **Response Headers:**

- `date`: Wed, 23 Sep 2026 21:22:53 GMT
- `content-type`: application/json; charset=utf-8
- `x-request-id`: req_011EwJlXJyaGWnXkFszJ9EOgTqv
- `server`: cloudflare

- **Conclusion:** Provider accepted `Authorization: Bearer` header authentication. Request was processed successfully.

---

## Comparison

| Method | Status | Body Size | Elapsed |
| :--- | :---: | :---: | :---: |
| `x-api-key` | 200 | 387 bytes | 4414ms |
| `Authorization: Bearer` | 200 | 387 bytes | 1760ms |

**Working method:** Both `x-api-key` and `Authorization: Bearer` work — provider accepts either header format.

---

## Root Cause

Both methods worked. The provider accepts either header format. No root cause issue identified.

---

*API key never exposed in this report. Key shown only as masked prefix+suffix.*
