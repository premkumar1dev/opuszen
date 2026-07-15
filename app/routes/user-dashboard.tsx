import { type MetaFunction } from "react-router";
import UserDashboard from "../components/dashboard/user-dashboard";

export const meta: MetaFunction = () => {
	return [
		{ title: "Dashboard | Opuszen" },
		{
			name: "description",
			content:
				"Your OpusZen API dashboard — manage keys, check usage, and monitor your account.",
		},
	];
};

export default function UserDashboardRoute() {
	return <UserDashboard />;
}
