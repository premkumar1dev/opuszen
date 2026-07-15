-- Add token-pricing support to user_api_keys
-- Stores per-key plan token pricing and token counters for billing

alter table public.user_api_keys
 add column if not exists plan_name text default 'Trial Plan',
 add column if not exists pricing_type text not null default 'flat' check (pricing_type in ('flat', 'per_token')),
 add column if not exists price_per_1m_input_tokens numeric(10,4) not null default 0,
 add column if not exists price_per_1m_output_tokens numeric(10,4) not null default 0,
 add column if not exists last_prompt_tokens integer not null default 0,
 add column if not exists last_completion_tokens integer not null default 0,
 add column if not exists total_prompt_tokens integer not null default 0,
 add column if not exists total_completion_tokens integer not null default 0;

comment on column public.user_api_keys.pricing_type is 'flat = subscription-based, per_token = pay-as-you-go token billing';
comment on column public.user_api_keys.price_per_1m_input_tokens is 'Plan input token price used for this key';
comment on column public.user_api_keys.price_per_1m_output_tokens is 'Plan output token price used for this key';
comment on column public.user_api_keys.last_prompt_tokens is 'Prompt tokens from the most recent request (for per-token billing calc)';
comment on column public.user_api_keys.last_completion_tokens is 'Completion tokens from the most recent request';
comment on column public.user_api_keys.total_prompt_tokens is 'Cumulative prompt tokens used by this key';
comment on column public.user_api_keys.total_completion_tokens is 'Cumulative completion tokens used by this key';
