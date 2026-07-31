import type { Route } from "./+types/not-found";

export async function loader() {
  throw new Response("Not Found", { status: 404, statusText: "Not Found" });
}

export default function NotFound() {
  return null;
}
