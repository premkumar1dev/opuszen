-- Add per-token pricing fields to plans table
-- Plans can now use either flat pricing (existing `price` + `duration_days`)
-- or per-token pricing (new fields below). Set both to 0 to use flat pricing.

alter table public.plans
 add column if not exists price_per_1m_input_tokens numeric(10,4) not null default 0,
 add column if not exists price_per_1m_output_tokens numeric(10,4) not null default 0,
 add column if not exists min_credits numeric(10,2) default 0;

-- per-token plans need a minimum credit purchase so users can actually make calls
comment on column public.plans.price_per_1m_input_tokens is 'Price per 1 million input tokens in plan currency (0 = use flat pricing)';
comment on column public.plans.price_per_1m_output_tokens is 'Price per 1 million output tokens in plan currency (0 = use flat pricing)';
comment on column public.plans.min_credits is 'Minimum credits to purchase when using per-token pricing (in plan currency)';
