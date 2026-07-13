import { type RouteConfig, index } from "@react-router/dev/routes";

export default [
 index("routes/home.tsx"),
 {
 path: "/auth/login",
 file: "routes/login.tsx",
 },
 {
 path: "/auth/signup",
 file: "routes/signup.tsx",
 },
 {
 path: "/auth/forgot-password",
 file: "routes/forgot-password.tsx",
 },
 {
 path: "/auth/reset-password",
 file: "routes/reset-password.tsx",
 },
 {
 path: "/auth/oauth-callback",
 file: "routes/oauth-callback.tsx",
 },
 {
 path: "/auth/admin",
 file: "routes/admin-login.tsx",
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
 path: "/key-status",
 file: "routes/key-status.tsx",
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
 path: "/api/chat/completions",
 file: "routes/api.chat.completions.tsx",
 },
 {
 path: "/api/key-status",
 file: "routes/api.key-status.tsx",
 },
 {
 path: "/dashboard/*",
 file: "routes/dashboard.tsx",
 },
] satisfies RouteConfig;
