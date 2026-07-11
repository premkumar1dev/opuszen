import { Admin, Resource, defaultTheme } from "react-admin";
import KeyIcon from "@mui/icons-material/Key";
import HistoryIcon from "@mui/icons-material/History";
import { dataProvider } from "./dataProvider";
import { authProvider } from "./authProvider";
import { DashboardHome } from "./dashboardHome";
import { ApiKeyList, ApiKeyShow, ApiKeyCreate, ApiKeyEdit } from "./apiKeys";
import { LogList, LogShow } from "./logs";

// Custom Dark Theme mapping OpusZen style (Cyberpunk / Slate Dark / Neon Accent)
const opusZenDarkTheme = {
  ...defaultTheme,
  palette: {
    mode: "dark" as const,
    primary: {
      main: "#6366f1", // Indigo
    },
    secondary: {
      main: "#ec4899", // Pink
    },
    background: {
      default: "#09090b", // Zinc 950
      paper: "#121215", // Dark Card
    },
    text: {
      primary: "#f4f4f5",
      secondary: "#a1a1aa",
    },
    divider: "#27272a",
  },
  typography: {
    fontFamily: '"Inter", "system-ui", "sans-serif"',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          borderRadius: 16,
          border: "1px solid rgba(39, 39, 42, 0.6)",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#121215",
          backgroundImage: "none",
          borderBottom: "1px solid #27272a",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: "none" as const,
          fontWeight: 600,
        },
      },
    },
  },
};

export function AdminApp() {
  return (
    <Admin
      basename="/dashboard"
      dataProvider={dataProvider}
      authProvider={authProvider}
      dashboard={DashboardHome}
      theme={opusZenDarkTheme}
      darkTheme={opusZenDarkTheme}
      defaultTheme="dark"
    >
      <Resource
        name="api_keys"
        list={ApiKeyList}
        show={ApiKeyShow}
        create={ApiKeyCreate}
        edit={ApiKeyEdit}
        icon={KeyIcon}
        options={{ label: "API Keys" }}
      />
      <Resource
        name="logs"
        list={LogList}
        show={LogShow}
        icon={HistoryIcon}
        options={{ label: "Request Logs" }}
      />
    </Admin>
  );
}
