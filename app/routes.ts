import { type RouteConfig, index } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	{
		path: "/auth/admin",
		file: "routes/admin-login.tsx",
	},
	{
		path: "/auth/admin/session",
		file: "routes/auth.admin.session.tsx",
	},
	{
		path: "/auth/admin/logout",
		file: "routes/auth.admin.logout.tsx",
	},
	{
		path: "/auth/admin/dashboard",
		file: "routes/admin-dashboard.tsx",
	},
	{
		path: "/auth/admin/users",
		file: "routes/admin-users.tsx",
	},
	{
		path: "/auth/admin/analytics",
		file: "routes/admin-analytics.tsx",
	},
	{
		path: "/auth/admin/gateway",
		file: "routes/admin-gateway.tsx",
	},
	{
		path: "/auth/admin/gateway/keys",
		file: "routes/admin-gateway-keys.tsx",
	},
	{
		path: "/auth/admin/gateway/user-keys",
		file: "routes/admin-gateway-user-keys.tsx",
	},
	{
		path: "/auth/admin/gateway/logs",
		file: "routes/admin-gateway-logs.tsx",
	},
	{
		path: "/auth/admin/gateway/failover-logs",
		file: "routes/admin-gateway-failover-logs.tsx",
	},
	{
		path: "/auth/admin/gateway/health",
		file: "routes/admin-gateway-health.tsx",
	},
	{
		path: "/auth/admin/gateway/settings",
		file: "routes/admin-gateway-settings.tsx",
	},
	{
		path: "/auth/admin/settings",
		file: "routes/admin-settings.tsx",
	},
	{
		path: "/auth/admin/settings/payments",
		file: "routes/admin-settings-payments.tsx",
	},
	{
		path: "/auth/admin/settings/site",
		file: "routes/admin-settings-site.tsx",
	},
	{
		path: "/auth/admin/plans",
		file: "routes/admin-plans.tsx",
	},
	{
		path: "/auth/admin/assign-plans",
		file: "routes/admin-assign-plans.tsx",
	},
	{
		path: "/auth/admin/activity-logs",
		file: "routes/admin-activity-logs.tsx",
	},
	{
		path: "/auth/admin/orders",
		file: "routes/admin-orders.tsx",
	},
	{
		path: "/auth/admin/payments",
		file: "routes/admin-payments.tsx",
	},
	{
		path: "/docs",
		file: "routes/docs.tsx",
	},
	{
		path: "/status",
		file: "routes/status.tsx",
	},
	{
		id: "api-status",
		path: "/api/status",
		file: "routes/api.status.tsx",
	},
	{
		path: "/pricing",
		file: "routes/pricing.tsx",
	},
	{
		path: "/key-status",
		file: "routes/key-status.tsx",
	},
	{
		path: "/orders",
		file: "routes/orders.tsx",
	},
	{
		path: "/setup.ps1",
		file: "routes/setup-ps1.tsx",
	},
	{
		path: "/setup.sh",
		file: "routes/setup-sh.tsx",
	},
	{
		path: "/terms",
		file: "routes/terms.tsx",
	},
	{
		path: "/privacy",
		file: "routes/privacy.tsx",
	},
	{
		id: "api-chat-completions",
		path: "/api/chat/completions",
		file: "routes/api.chat.completions.tsx",
	},
	{
		id: "chat-completions-root",
		path: "/chat/completions",
		file: "routes/api.chat.completions.tsx",
	},
	{
		id: "messages-root",
		path: "/messages",
		file: "routes/api.chat.completions.tsx",
	},
	{
		id: "models-root",
		path: "/models",
		file: "routes/api.v1.models.tsx",
	},
	{
		id: "health-root",
		path: "/health",
		file: "routes/api.status.tsx",
	},
	{
		id: "v1-health",
		path: "/v1/health",
		file: "routes/api.status.tsx",
	},
	{
		id: "v1-chat-completions",
		path: "/v1/chat/completions",
		file: "routes/api.chat.completions.tsx",
	},
	{
		id: "v1-messages",
		path: "/v1/messages",
		file: "routes/api.chat.completions.tsx",
	},
	{
		id: "v1-models",
		path: "/v1/models",
		file: "routes/api.v1.models.tsx",
	},
	{
		id: "v1-splat",
		path: "/v1/*",
		file: "routes/api.chat.completions.tsx",
	},
	{
		id: "api-v1-chat-completions",
		path: "/api/v1/chat/completions",
		file: "routes/api.chat.completions.tsx",
	},
	{
		id: "api-v1-messages",
		path: "/api/v1/messages",
		file: "routes/api.chat.completions.tsx",
	},
	{
		id: "api-v1-models",
		path: "/api/v1/models",
		file: "routes/api.v1.models.tsx",
	},
	{
		id: "api-v1-splat",
		path: "/api/v1/*",
		file: "routes/api.chat.completions.tsx",
	},
	{
		path: "/api/key-status",
		file: "routes/api.key-status.tsx",
	},
	{
		path: "/api/payment",
		file: "routes/api.payment.tsx",
	},
	{
		path: "/api/finalize-key",
		file: "routes/api.finalize-key.tsx",
	},
	{
		path: "/api/child-keys",
		file: "routes/api.child-keys.tsx",
	},
	{
		path: "*",
		file: "routes/not-found.tsx",
	},
] satisfies RouteConfig;
