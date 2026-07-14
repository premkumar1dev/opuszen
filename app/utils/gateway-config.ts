/**
 * Gateway Configuration Service
 * Reads/writes gateway settings from Supabase gateway_config table
 */
import { supabaseServer as supabase } from "~/utils/supabase.server";
import type { GatewayConfigRow } from "~/types/gateway";

const DEFAULTS: Record<string, { value: string; value_type: GatewayConfigRow['value_type']; description: string }> = {
 retry_count: { value: '3', value_type: 'number', description: 'Retry attempts on failover' },
 retry_delay_ms: { value: '1000', value_type: 'number', description: 'Delay between retries in ms' },
 failover_enabled: { value: 'true', value_type: 'boolean', description: 'Enable automatic failover' },
 health_check_interval_seconds: { value: '60', value_type: 'number', description: 'Health check interval in seconds' },
 request_timeout_ms: { value: '120000', value_type: 'number', description: 'HTTP request timeout in ms' },
 auto_disable_failed_keys: { value: 'true', value_type: 'boolean', description: 'Auto-disable keys after repeated failures' },
 auto_recover_keys: { value: 'true', value_type: 'boolean', description: 'Auto-recover keys after cooldown' },
 auto_recover_after_minutes: { value: '30', value_type: 'number', description: 'Minutes before auto-recovery' },
 max_consecutive_failures: { value: '5', value_type: 'number', description: 'Max failures before key auto-disabled' },
 rate_limit_window_minutes: { value: '1', value_type: 'number', description: 'Rate limit window in minutes' },
 default_rate_limit: { value: '60', value_type: 'number', description: 'Default reqs per minute rate limit' },
 supported_providers: { value: '["OpenAI","Anthropic","Google","Groq","Mistral","Cohere","AI21"]', value_type: 'json', description: 'Supported AI providers' },
};

let cachedConfig: Record<string, GatewayConfigRow> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000;

function parseValue(row: GatewayConfigRow): any {
 switch (row.value_type) {
 case 'number': return parseFloat(row.value) || 0;
 case 'boolean': return row.value === 'true';
 case 'json': try { return JSON.parse(row.value); } catch { return row.value; }
 default: return row.value;
 }
}

export async function loadGatewayConfig(): Promise<Record<string, any>> {
 const now = Date.now();
 if (cachedConfig && now - cacheTimestamp < CACHE_TTL_MS) {
 const out: Record<string, any> = {};
 for (const [k, v] of Object.entries(cachedConfig)) out[k] = parseValue(v);
 return out;
 }

 try {
 const { data, error } = await supabase.from('gateway_config').select('*');
 if (error || !data) throw error;
 cachedConfig = {};
 for (const row of data as GatewayConfigRow[]) {
 cachedConfig[row.key] = row;
 }
 cacheTimestamp = now;
 } catch {
 cachedConfig = null;
 cacheTimestamp = 0;
 }

 const out: Record<string, any> = {};
 if (cachedConfig) {
 for (const [k, v] of Object.entries(cachedConfig)) out[k] = parseValue(v);
 }
 return out;
}

export async function getGatewayConfig(key: string): Promise<any> {
 const configs = await loadGatewayConfig();
 return configs[key] ?? parseValue({ key, value: DEFAULTS[key]?.value ?? '', value_type: DEFAULTS[key]?.value_type ?? 'string' } as GatewayConfigRow);
}

export async function updateGatewayConfig(key: string, value: string, value_type?: GatewayConfigRow['value_type']): Promise<void> {
 const vt = value_type ?? DEFAULTS[key]?.value_type ?? 'string';
 const { error } = await supabase.from('gateway_config').upsert({ key, value, value_type: vt, updated_at: new Date().toISOString() }, { onConflict: 'key' });
 if (error) throw new Error(`Failed to update config: ${error.message}`);
 cachedConfig = null;
 cacheTimestamp = 0;
}

export function getDefaultConfig(key: string): any {
 const def = DEFAULTS[key];
 if (!def) return undefined;
 return parseValue(def as GatewayConfigRow);
}

export function getAllDefaultConfigs(): Record<string, any> {
 const out: Record<string, any> = {};
 for (const [k, v] of Object.entries(DEFAULTS)) out[k] = parseValue(v as GatewayConfigRow);
 return out;
}

export async function refreshConfigCache() {
 cachedConfig = null;
 cacheTimestamp = 0;
 await loadGatewayConfig();
}
