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
    path: "/auth/admin",
    file: "routes/admin-login.tsx",
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
] satisfies RouteConfig;
