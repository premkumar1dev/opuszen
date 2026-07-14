import { vercelPreset } from "@vercel/react-router/vite";
import type { Config } from "@react-router/dev/config";

export default {
 // Server-side render by default, to enable SPA mode set this to `false`
 ssr: true,
 presets: [vercelPreset()],
 future: {
 unstable_optimizeDeps: true,
 },
 // v8_splitRouteModules has graduated to a top-level field (default `true`)
 splitRouteModules: true,
} satisfies Config;