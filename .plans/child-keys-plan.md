# Child Keys Feature — Implementation Plan

## Goal
Allow users to create "ZA child keys" (`za_` prefix) derived from a parent plan key (`sk_live_`). Child keys inherit the parent's plan settings (rate limit, tokens, expiry, models) but have their own independent key string for use in applications.

## Key Design Decisions
- **Prefix**: parent = `sk_live_`, child = `za_` (easy identification in logs)
- **Shared plan**: child inherits parent's `plan_name`, `pricing_type`, `rate_limit` (half), `tokens_limit`, `expiry_date`, `allowed_models`, `allowed_providers`, pricing
- **Independent usage**: child has its own `total_requests`, `success_requests`, `failed_requests` counters but SHARES credits with parent (queries check parent.remaining_credits)
- **Max depth**: 5 levels (prevents infinite nesting)
- **UI**: New `/user/child-keys` page showing all parent keys with their children

## Files to create/modify

### 1. Database Migration — `supabase/migrations/20260726000002_child_api_keys.sql` ✅ DONE
- Add `parent_key_id` column to `user_api_keys`
- Add index for fast child lookups
- Add user UPDATE policy (needed for child management)

### 2. API Endpoint — `app/routes/api.child-keys.tsx` ✅ DONE
- `action=create`: creates child key inheriting parent settings
- `action=list`: lists children of a parent
- `action=revoke`: revokes a child key (status → revoked)
- `action=delete`: permanently deletes a child key
- Uses service-role client, bypasses RLS

### 3. Routes — `app/routes.ts` ✅ DONE
- Added `/user/child-keys` route → `routes/user-child-keys.tsx`
- Added `/api/child-keys` route → `routes/api.child-keys.tsx`

### 4. Child Keys Page — `app/routes/user-child-keys.tsx` (NEW)
- Shows all user's top-level keys (no parent) as "parent keys"
- Expandable section per parent showing its children
- "Create Child Key" button per parent → opens inline form (name input)
- Revoke / Delete actions per child key
- Copy key functionality
- Inherited settings display (plan, rate limit, expiry)

### 5. Sidebar — `app/components/dashboard/dashboard-sidebar.tsx` (MODIFY)
- Add "Child Keys" nav item with `FiCopy` or `FiGitBranch` icon
- Link to `/user/child-keys`

## Credit Sharing Logic
Child keys do NOT have independent credits. When the API gateway processes a child key request:
1. Look up the child key in `user_api_keys`
2. Follow `parent_key_id` chain up to the root (top-level key)
3. Use the root key's `remaining_credits` for billing
4. Decrement `remaining_credits` on the root key

This requires updating the gateway's key resolution logic. For now, child keys will work functionally (they authenticate and inherit settings), but credit tracking will be added as a follow-up by updating the gateway-service lookup.

## What's Already Done
- ✅ `routes.ts` — routes added
- ✅ `api.child-keys.tsx` — API endpoint
- ✅ `20260726000002_child_api_keys.sql` — migration
- ✅ `dashboard-sidebar.tsx` — nav item

## What Still Needs Implementation
- ❌ `user-child-keys.tsx` — the page component
- ⚠️ Gateway credit sharing (follow-up, not blocking)
