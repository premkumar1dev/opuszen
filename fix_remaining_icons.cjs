const fs = require('fs');
const path = require('path');

const ICON_MAP = {
 "FiActivity": "Activity", "FiZap": "Zap", "FiClock": "Clock",
 "FiExternalLink": "ExternalLink", "FiRefreshCw": "RefreshCw",
 "FiHome": "Home", "FiUsers": "Users", "FiMessageSquare": "MessageSquare",
 "FiSettings": "Settings", "FiMenu": "Menu", "FiX": "X",
 "FiCheck": "Check", "FiShield": "Shield", "FiStar": "Star",
 "FiAward": "Award", "FiCreditCard": "CreditCard", "FiLoader": "Loader",
 "FiSmartphone": "Smartphone", "FiLock": "Lock", "FiSearch": "Search",
 "FiFilter": "Filter", "FiDownload": "Download", "FiUpload": "Upload",
 "FiTrash2": "Trash2", "FiEdit": "Edit", "FiEye": "Eye",
 "FiEyeOff": "EyeOff", "FiMail": "Mail", "FiBell": "Bell",
 "FiBarChart3": "BarChart3", "FiPieChart": "PieChart",
 "FiTrendingUp": "TrendingUp", "FiTrendingDown": "TrendingDown",
 "FiArrowRight": "ArrowRight", "FiArrowLeft": "ArrowLeft",
 "FiArrowUp": "ArrowUp", "FiArrowDown": "ArrowDown",
 "FiChevronRight": "ChevronRight", "FiChevronLeft": "ChevronLeft",
 "FiChevronDown": "ChevronDown", "FiChevronUp": "ChevronUp",
 "FiMoreVertical": "MoreVertical", "FiMoreHorizontal": "MoreHorizontal",
 "FiPlus": "Plus", "FiMinus": "Minus", "FiCopy": "Copy",
 "FiLink": "Link", "FiUnlink": "Unlink", "FiToggleLeft": "ToggleLeft",
 "FiToggleRight": "ToggleRight", "FiMoon": "Moon", "FiSun": "Sun",
 "FiCommand": "Command", "FiTerminal": "Terminal", "FiCode": "Code",
 "FiDatabase": "Database", "FiServer": "Server", "FiHardDrive": "HardDrive",
 "FiCpu": "Cpu", "FiGlobe": "Globe", "FiMapPin": "MapPin",
 "FiAlertCircle": "AlertCircle", "FiAlertTriangle": "AlertTriangle",
 "FiInfo": "Info", "FiHelpCircle": "HelpCircle", "FiLogOut": "LogOut",
 "FiLogIn": "LogIn", "FiUser": "User", "FiUserPlus": "UserPlus",
 "FiUserX": "UserX", "FiUserCheck": "UserCheck", "FiKey": "Key",
 "FiPackage": "Package", "FiShoppingBag": "ShoppingBag",
 "FiShoppingCart": "ShoppingCart", "FiCalendar": "Calendar",
 "FiPercent": "Percent", "FiHash": "Hash", "FiType": "Type",
 "FiAlignLeft": "AlignLeft", "FiAlignCenter": "AlignCenter",
 "FiAlignRight": "AlignRight", "FiImage": "Image", "FiFilm": "Film",
 "FiMusic": "Music", "FiVideo": "Video", "FiPlay": "Play",
 "FiPause": "Pause", "FiSquare": "Square", "FiCircle": "Circle",
 "FiHexagon": "Hexagon", "FiTriangle": "Triangle",
 "FaRupeeSign": "IndianRupee",
 "SiGooglepay": "GooglePayIcon",
 "SiPhonepe": "PhonePeIcon",
 "SiPaytm": "PaytmIcon",
 "FaWhatsapp": "MessageCircle",
};

const SOURCES = [
 "react-icons/fi", "react-icons/fa6", "react-icons/fa",
 "react-icons/si", "react-icons/md", "react-icons/bi",
 "react-icons/io5", "react-icons/ri", "react-icons/gi", "react-icons/hi",
];

const files = [
 "app/routes/admin-dashboard.tsx",
 "app/components/admin/admin-sidebar.tsx",
 "app/components/admin/dashboardHome.tsx",
 "app/components/dashboard/dashboard-sidebar.tsx",
 "app/routes/admin-assign-plans.tsx",
 "app/routes/admin-activity-logs.tsx",
];

let count = 0;
for (const rel of files) {
 const filepath = path.join(rel);
 let content = fs.readFileSync(filepath, 'utf8');
 let original = content;

 for (const src of SOURCES) {
 content = content.replace('from "' + src + '"', 'from "lucide-react"');
 }
 for (const [oldIcon, newIcon] of Object.entries(ICON_MAP)) {
 content = content.replace(new RegExp('\\b' + oldIcon + '\\b', 'g'), newIcon);
 }

 if (content !== original) {
 fs.writeFileSync(filepath, content);
 count++;
 console.log("Fixed: " + rel);
 }
}
console.log("Done: " + count + " files");
