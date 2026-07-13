import { Admin, Resource, defaultTheme, Layout, Menu } from "react-admin";
import KeyIcon from "@mui/icons-material/Key";
import HistoryIcon from "@mui/icons-material/History";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PeopleIcon from "@mui/icons-material/People";
import CardMembershipIcon from "@mui/icons-material/CardMembership";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
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

export const CustomMenu = () => (
 <Menu>
 <MenuItem
 component="a"
 href="/auth/admin/dashboard"
 style={{
 color: "#a1a1aa",
 borderRadius: 10,
 margin: "4px 8px",
 padding: "8px 16px",
 }}
 >
 <ListItemIcon style={{ color: "#a1a1aa", minWidth: 36 }}>
 <ArrowBackIcon fontSize="small" />
 </ListItemIcon>
 <ListItemText
 primary={<span style={{ fontSize: 13, fontWeight: 600, fontFamily: '"Inter", sans-serif' }}>Back to Portal</span>}
 />
 </MenuItem>
 <MenuItem
 component="a"
 href="/auth/admin/users"
 style={{
 color: "#a1a1aa",
 borderRadius: 10,
 margin: "4px 8px",
 padding: "8px 16px",
 }}
 >
 <ListItemIcon style={{ color: "#a1a1aa", minWidth: 36 }}>
 <PeopleIcon fontSize="small" />
 </ListItemIcon>
 <ListItemText
 primary={<span style={{ fontSize: 13, fontWeight: 600, fontFamily: '"Inter", sans-serif' }}>Manage Users</span>}
 />
 </MenuItem>
 <MenuItem
 component="a"
 href="/auth/admin/plans"
 style={{
 color: "#a1a1aa",
 borderRadius: 10,
 margin: "4px 8px",
 padding: "8px 16px",
 }}
 >
 <ListItemIcon style={{ color: "#a1a1aa", minWidth: 36 }}>
 <CardMembershipIcon fontSize="small" />
 </ListItemIcon>
 <ListItemText
 primary={<span style={{ fontSize: 13, fontWeight: 600, fontFamily: '"Inter", sans-serif' }}>Subscription Plans</span>}
 />
 </MenuItem>
 <Menu.ResourceItem name="api_keys" />
 <Menu.ResourceItem name="logs" />
 </Menu>
);

const CustomLayout = (props: any) => <Layout {...props} menu={CustomMenu} />;

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
 layout={CustomLayout}
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
