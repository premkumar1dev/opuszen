import { type DataProvider } from "react-admin";

// Define TypeScript interfaces
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  planName: string;
  unlimited: boolean;
  usagePercent: number;
  totalRequests: number;
  rateLimit: number;
  expiresAt: string;
  createdAt: string;
  lastUsedAt: string;
  isActive: boolean;
  windowTokensLimit: number;
  windowTokensUsed: number;
}

export interface RequestLog {
  id: string;
  keyId: string;
  keyPrefix: string;
  model: string;
  status: number;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  time: string;
}

// Initial Mock Data
const INITIAL_KEYS: ApiKey[] = [
  {
    id: "key-1",
    name: "Production Gateway Key",
    keyPrefix: "op_live_sk93j02a11b98c39e2",
    planName: "Enterprise Plan (20x)",
    unlimited: false,
    usagePercent: 42.4,
    totalRequests: 24591,
    rateLimit: 120,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(), // 45 days ago
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 320).toISOString(), // 320 days left
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(), // 2 mins ago
    isActive: true,
    windowTokensLimit: 20000000,
    windowTokensUsed: 8480000,
  },
  {
    id: "key-2",
    name: "Staging Testing Key",
    keyPrefix: "op_live_t7x84b22c011e49aa1",
    planName: "Pro Plan (5x)",
    unlimited: false,
    usagePercent: 18.2,
    totalRequests: 3821,
    rateLimit: 60,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(), // 20 days ago
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 40).toISOString(), // 40 days left
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    isActive: true,
    windowTokensLimit: 5000000,
    windowTokensUsed: 910000,
  },
  {
    id: "key-3",
    name: "Internal Dev Key",
    keyPrefix: "op_live_z8w19c83b772c918f0",
    planName: "Developer Plan (2x)",
    unlimited: true,
    usagePercent: 5.6,
    totalRequests: 1205,
    rateLimit: 30,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 360).toISOString(),
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hrs ago
    isActive: true,
    windowTokensLimit: 2000000,
    windowTokensUsed: 112000,
  },
  {
    id: "key-4",
    name: "Legacy Reseller Key",
    keyPrefix: "op_live_q4k11b22e998a72c10",
    planName: "Starter Plan (1x)",
    unlimited: false,
    usagePercent: 92.8,
    totalRequests: 8912,
    rateLimit: 15,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(), // 60 days ago
    expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // Expired 2 days ago
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    isActive: false,
    windowTokensLimit: 1000000,
    windowTokensUsed: 928000,
  },
  {
    id: "key-5",
    name: "Temp Hackathon Sandbox",
    keyPrefix: "op_live_m3n44k89f812a03bc2",
    planName: "Trial Plan",
    unlimited: false,
    usagePercent: 100,
    totalRequests: 500,
    rateLimit: 5,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hrs ago
    isActive: false,
    windowTokensLimit: 500000,
    windowTokensUsed: 500000,
  },
];

// Generate some sample logs for our keys
const MODELS = [
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "claude-3-opus-20240229",
];
const STATUSES = [200, 200, 200, 200, 200, 200, 200, 429, 500, 200, 200];

const generateLogs = (): RequestLog[] => {
  const logs: RequestLog[] = [];
  const keyMap = [
    { id: "key-1", prefix: "op_live_sk93...39e2" },
    { id: "key-2", prefix: "op_live_t7x8...aa1" },
    { id: "key-3", prefix: "op_live_z8w1...8f0" },
    { id: "key-4", prefix: "op_live_q4k1...c10" },
    { id: "key-5", prefix: "op_live_m3n4...bc2" },
  ];

  for (let i = 0; i < 60; i++) {
    const key = keyMap[Math.floor(Math.random() * keyMap.length)];
    const model = MODELS[Math.floor(Math.random() * MODELS.length)];
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    const latency = status === 200 ? Math.floor(Math.random() * 1500) + 300 : Math.floor(Math.random() * 200);
    const pTokens = Math.floor(Math.random() * 5000) + 500;
    const cTokens = status === 200 ? Math.floor(Math.random() * 2000) + 100 : 0;
    const time = new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 7)).toISOString(); // inside 7 days

    logs.push({
      id: `log-${i + 1}`,
      keyId: key.id,
      keyPrefix: key.prefix,
      model,
      status,
      latencyMs: latency,
      promptTokens: pTokens,
      completionTokens: cTokens,
      time,
    });
  }

  // Sort logs by time descending
  return logs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
};

// Helper storage functions
const getStorageData = <T>(key: string, initial: T[]): T[] => {
  if (typeof window === "undefined") return initial;
  const stored = window.localStorage.getItem(key);
  if (!stored) {
    window.localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(stored);
};

const setStorageData = <T>(key: string, data: T[]): void => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(data));
  }
};

// Implement React Admin Data Provider
export const dataProvider: DataProvider = {
  getList: async (resource, params) => {
    let items: any[] = [];
    if (resource === "api_keys") {
      items = getStorageData<ApiKey>("opuszen_api_keys", INITIAL_KEYS);
    } else if (resource === "logs") {
      items = getStorageData<RequestLog>("opuszen_logs", []);
      if (items.length === 0) {
        items = generateLogs();
        setStorageData("opuszen_logs", items);
      }
    }

    // Apply filters
    const filterKeys = Object.keys(params.filter || {});
    if (filterKeys.length > 0) {
      items = items.filter((item) => {
        return filterKeys.every((fKey) => {
          const filterValue = params.filter[fKey];
          if (filterValue === undefined || filterValue === "") return true;

          const itemValue = item[fKey];
          if (itemValue === undefined) return false;

          // Case-insensitive string search
          if (typeof filterValue === "string") {
            return String(itemValue).toLowerCase().includes(filterValue.toLowerCase());
          }
          // Strict equality for boolean/number
          return itemValue === filterValue;
        });
      });
    }

    // Apply sorting
    const { field, order } = params.sort || { field: "id", order: "ASC" };
    items.sort((a, b) => {
      let valA = a[field];
      let valB = b[field];

      if (typeof valA === "string" && typeof valB === "string") {
        return order === "ASC" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return order === "ASC"
        ? (valA > valB ? 1 : -1)
        : (valB > valA ? 1 : -1);
    });

    // Apply pagination
    const { page, perPage } = params.pagination || { page: 1, perPage: 10 };
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const pagedItems = items.slice(start, end);

    return {
      data: pagedItems,
      total: items.length,
    };
  },

  getOne: async (resource, params) => {
    let items: any[] = [];
    if (resource === "api_keys") {
      items = getStorageData<ApiKey>("opuszen_api_keys", INITIAL_KEYS);
    } else if (resource === "logs") {
      items = getStorageData<RequestLog>("opuszen_logs", []);
    }

    const record = items.find((item) => item.id === params.id);
    if (!record) {
      throw new Error(`Record not found: ${params.id} in resource ${resource}`);
    }

    return { data: record };
  },

  getMany: async (resource, params) => {
    let items: any[] = [];
    if (resource === "api_keys") {
      items = getStorageData<ApiKey>("opuszen_api_keys", INITIAL_KEYS);
    } else if (resource === "logs") {
      items = getStorageData<RequestLog>("opuszen_logs", []);
    }

    const matched = items.filter((item) => params.ids.includes(item.id));
    return { data: matched };
  },

  getManyReference: async (resource, params) => {
    let items: any[] = [];
    if (resource === "api_keys") {
      items = getStorageData<ApiKey>("opuszen_api_keys", INITIAL_KEYS);
    } else if (resource === "logs") {
      items = getStorageData<RequestLog>("opuszen_logs", []);
    }

    // Filter by the reference field
    let matched = items.filter((item) => item[params.target] === params.id);

    // Apply additional filters
    const filterKeys = Object.keys(params.filter || {});
    if (filterKeys.length > 0) {
      matched = matched.filter((item) => {
        return filterKeys.every((fKey) => {
          const filterValue = params.filter[fKey];
          if (filterValue === undefined || filterValue === "") return true;
          return String(item[fKey]).toLowerCase().includes(String(filterValue).toLowerCase());
        });
      });
    }

    // Apply sorting
    const { field, order } = params.sort || { field: "id", order: "ASC" };
    matched.sort((a, b) => {
      let valA = a[field];
      let valB = b[field];
      return order === "ASC"
        ? (valA > valB ? 1 : -1)
        : (valB > valA ? 1 : -1);
    });

    // Apply pagination
    const { page, perPage } = params.pagination || { page: 1, perPage: 10 };
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const pagedItems = matched.slice(start, end);

    return {
      data: pagedItems,
      total: matched.length,
    };
  },

  create: async (resource, params) => {
    if (resource !== "api_keys") {
      throw new Error("Creation is only supported for api_keys resource.");
    }

    const items = getStorageData<ApiKey>("opuszen_api_keys", INITIAL_KEYS);
    
    // Generate simple secure key representation
    const randomHex = Array.from({ length: 16 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
    const keyPrefix = `op_live_${randomHex.slice(0, 4)}...${randomHex.slice(-4)}`;

    const newKey: ApiKey = {
      id: `key-${Date.now()}`,
      name: params.data.name || "Unnamed Key",
      keyPrefix,
      planName: params.data.planName || "Pro Plan (5x)",
      unlimited: Boolean(params.data.unlimited),
      usagePercent: 0,
      totalRequests: 0,
      rateLimit: Number(params.data.rateLimit) || 60,
      createdAt: new Date().toISOString(),
      expiresAt: params.data.expiresAt || new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      lastUsedAt: "Never",
      isActive: true,
      windowTokensLimit: params.data.windowTokensLimit ? Number(params.data.windowTokensLimit) : 5000000,
      windowTokensUsed: 0,
    };

    const updated = [...items, newKey];
    setStorageData("opuszen_api_keys", updated);

    return { data: newKey as any };
  },

  update: async (resource, params) => {
    if (resource !== "api_keys") {
      throw new Error("Update is only supported for api_keys resource.");
    }

    const items = getStorageData<ApiKey>("opuszen_api_keys", INITIAL_KEYS);
    const index = items.findIndex((item) => item.id === params.id);
    if (index === -1) {
      throw new Error(`Record not found: ${params.id}`);
    }

    // Merge changes
    const updatedRecord = { ...items[index], ...params.data } as ApiKey;
    items[index] = updatedRecord;
    setStorageData("opuszen_api_keys", items);

    return { data: updatedRecord as any };
  },

  updateMany: async (resource, params) => {
    if (resource !== "api_keys") {
      throw new Error("Update is only supported for api_keys resource.");
    }

    const items = getStorageData<ApiKey>("opuszen_api_keys", INITIAL_KEYS);
    const updatedIds: string[] = [];

    const updated = items.map((item) => {
      if (params.ids.includes(item.id)) {
        updatedIds.push(item.id);
        return { ...item, ...params.data };
      }
      return item;
    });

    setStorageData("opuszen_api_keys", updated);
    return { data: updatedIds };
  },

  delete: async (resource, params) => {
    let items: any[] = [];
    if (resource === "api_keys") {
      items = getStorageData<ApiKey>("opuszen_api_keys", INITIAL_KEYS);
      const filtered = items.filter((item) => item.id !== params.id);
      setStorageData("opuszen_api_keys", filtered);
    } else if (resource === "logs") {
      items = getStorageData<RequestLog>("opuszen_logs", []);
      const filtered = items.filter((item) => item.id !== params.id);
      setStorageData("opuszen_logs", filtered);
    }

    return { data: params.previousData as any };
  },

  deleteMany: async (resource, params) => {
    let items: any[] = [];
    if (resource === "api_keys") {
      items = getStorageData<ApiKey>("opuszen_api_keys", INITIAL_KEYS);
      const filtered = items.filter((item) => !params.ids.includes(item.id));
      setStorageData("opuszen_api_keys", filtered);
    } else if (resource === "logs") {
      items = getStorageData<RequestLog>("opuszen_logs", []);
      const filtered = items.filter((item) => !params.ids.includes(item.id));
      setStorageData("opuszen_logs", filtered);
    }

    return { data: params.ids as any };
  },
};
