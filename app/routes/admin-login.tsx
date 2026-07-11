import { type MetaFunction } from "react-router";
import { AdminLoginForm } from "~/components/ui/admin-login";

export const meta: MetaFunction = () => {
 return [
 { title: "Admin Portal Login | OpusZen" },
 {
 name: "description",
 content: "Secure administrator access panel for the OpusZen API gateway.",
 },
 ];
};

export default function AdminLoginRoute() {
 return <AdminLoginForm />;
}
