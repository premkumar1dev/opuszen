import { useEffect, useState } from "react";
import { useDataProvider, useNotify } from "react-admin";
import {
  FiKey,
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiZap,
} from "react-icons/fi";
import { type ApiKey, type RequestLog } from "./dataProvider";

export function DashboardHome() {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const [stats, setStats] = useState({
    totalKeys: 0,
    activeKeys: 0,
    totalRequests: 0,
    errorRate: 0,
    avgLatency: 0,
    modelDistribution: {} as Record<string, number>,
    recentLogs: [] as RequestLog[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: keys } = await dataProvider.getList<ApiKey>("api_keys", {
          pagination: { page: 1, perPage: 100 },
          sort: { field: "id", order: "ASC" },
          filter: {},
        });

        const { data: logs } = await dataProvider.getList<RequestLog>("logs", {
          pagination: { page: 1, perPage: 100 },
          sort: { field: "time", order: "DESC" },
          filter: {},
        });

        const totalKeys = keys.length;
        const activeKeys = keys.filter((k) => k.isActive).length;

        // Sum total requests across keys
        const totalRequests = keys.reduce((sum, k) => sum + k.totalRequests, 0);

        // Analyze logs
        const errorLogs = logs.filter((l) => l.status >= 400).length;
        const errorRate = logs.length > 0 ? (errorLogs / logs.length) * 100 : 0;

        const totalLatency = logs.reduce((sum, l) => sum + l.latencyMs, 0);
        const avgLatency = logs.length > 0 ? Math.round(totalLatency / logs.length) : 0;

        // Model distribution
        const modelDistribution = logs.reduce((acc, l) => {
          const name = l.model.replace("-20241022", "").replace("-20240229", "");
          acc[name] = (acc[name] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        setStats({
          totalKeys,
          activeKeys,
          totalRequests,
          errorRate,
          avgLatency,
          modelDistribution,
          recentLogs: logs.slice(0, 5),
        });
      } catch (err: any) {
        notify("Failed to load dashboard metrics", { type: "warning" });
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [dataProvider, notify]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center font-mono text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <div>Loading Gateway Analytics...</div>
        </div>
      </div>
    );
  }

  // Model colors for custom charts
  const modelColors: Record<string, string> = {
    "claude-3-5-sonnet": "bg-indigo-500",
    "claude-3-5-haiku": "bg-emerald-500",
    "claude-3-opus": "bg-violet-500",
  };

  const totalLogsCount = Object.values(stats.modelDistribution).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8 p-6 text-zinc-100 bg-[#09090b]">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <FiZap className="text-indigo-400 size-7" />
          Gateway Control Core
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Real-time metrics, budget monitoring, and security routing rules.
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Keys */}
        <div className="p-6 rounded-2xl border border-zinc-800 bg-[#121215] flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Total API Keys</span>
            <div className="text-3xl font-bold text-white">{stats.totalKeys}</div>
            <div className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {stats.activeKeys} active keys
            </div>
          </div>
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <FiKey className="size-6" />
          </div>
        </div>

        {/* Total Requests */}
        <div className="p-6 rounded-2xl border border-zinc-800 bg-[#121215] flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Total Requests</span>
            <div className="text-3xl font-bold text-white">{stats.totalRequests.toLocaleString()}</div>
            <div className="text-xs text-indigo-400 flex items-center gap-1 font-mono">
              <FiActivity className="size-3" />
              All-time routed requests
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <FiZap className="size-6" />
          </div>
        </div>

        {/* Average Latency */}
        <div className="p-6 rounded-2xl border border-zinc-800 bg-[#121215] flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Avg Latency</span>
            <div className="text-3xl font-bold text-white">{stats.avgLatency}ms</div>
            <div className="text-xs text-zinc-400 flex items-center gap-1 font-mono">
              <FiClock className="size-3 text-zinc-500" />
              Response stream handshake
            </div>
          </div>
          <div className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl">
            <FiClock className="size-6" />
          </div>
        </div>

        {/* Error Rate */}
        <div className="p-6 rounded-2xl border border-zinc-800 bg-[#121215] flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Error Rate</span>
            <div className="text-3xl font-bold text-white">{stats.errorRate.toFixed(1)}%</div>
            <div className={`text-xs flex items-center gap-1 font-mono ${stats.errorRate < 10 ? "text-emerald-400" : "text-amber-400"}`}>
              {stats.errorRate < 10 ? (
                <>
                  <FiCheckCircle className="size-3" /> System healthy
                </>
              ) : (
                <>
                  <FiAlertTriangle className="size-3" /> Degraded system health
                </>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-xl border ${stats.errorRate < 10 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
            <FiAlertTriangle className="size-6" />
          </div>
        </div>
      </div>

      {/* Main Charts & Logs Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Model Distribution */}
        <div className="p-6 rounded-2xl border border-zinc-800 bg-[#121215] shadow-lg">
          <h2 className="text-lg font-bold text-white mb-4">Model Usage Ratio</h2>
          <div className="space-y-4">
            {Object.entries(stats.modelDistribution).map(([model, count]) => {
              const percentage = totalLogsCount > 0 ? (count / totalLogsCount) * 100 : 0;
              const colorClass = modelColors[model] || "bg-zinc-500";
              return (
                <div key={model} className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-300 font-semibold">{model}</span>
                    <span className="text-zinc-400">{percentage.toFixed(1)}% ({count} reqs)</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live System Alerts */}
        <div className="p-6 rounded-2xl border border-zinc-800 bg-[#121215] shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Live Diagnostics</h2>
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-start gap-2.5">
                <FiCheckCircle className="text-emerald-400 size-4 mt-0.5 shrink-0" />
                <div>
                  <div className="text-zinc-300 font-semibold">Supabase Auth Gateway</div>
                  <div className="text-zinc-500 mt-0.5">TLS 1.3 handshake operational. Session validation active.</div>
                </div>
              </div>
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-start gap-2.5">
                <FiAlertTriangle className="text-amber-400 size-4 mt-0.5 shrink-0" />
                <div>
                  <div className="text-zinc-300 font-semibold">Key Expired Notification</div>
                  <div className="text-zinc-500 mt-0.5">Key Prefix "op_live_q4k1" exceeded trial time limit. Routed to offline handler.</div>
                </div>
              </div>
            </div>
          </div>
          <div className="text-zinc-600 text-[10px] mt-4 font-mono uppercase tracking-wider text-right">
            Gateway Engine v1.2.0
          </div>
        </div>
      </div>

      {/* Recent Logs List */}
      <div className="p-6 rounded-2xl border border-zinc-800 bg-[#121215] shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white">Recent Gateway Activity</h2>
          <span className="text-xs text-zinc-500 font-mono">Last 5 API Calls</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs text-zinc-300">
            <thead>
              <tr className="border-b border-zinc-800 pb-2 text-zinc-500">
                <th className="py-2">Time</th>
                <th className="py-2">API Key</th>
                <th className="py-2">Model</th>
                <th className="py-2">Latency</th>
                <th className="py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentLogs.map((log) => (
                <tr key={log.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30">
                  <td className="py-2.5 text-zinc-500">
                    {new Date(log.time).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 text-zinc-400 font-semibold">{log.keyPrefix}</td>
                  <td className="py-2.5 text-zinc-300">{log.model.replace("-20241022", "")}</td>
                  <td className="py-2.5 text-zinc-400">{log.latencyMs}ms</td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === 200
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : log.status === 429
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
