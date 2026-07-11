const features = [
 'Per-key budgets with 5h rolling windows',
 'Isolated rate limits & expiry per key',
 'Zero-latency SSE streaming pass-through',
 'Prompt caching — cache tokens are free',
 'Drop-in Anthropic SDK compatible',
 'Works with Claude Code, Cursor, any IDE',
]

export function WhyOpusZen() {
 return (
 <section className="relative py-24 px-4 bg-muted/30 dark:bg-muted/10" aria-labelledby="why-heading">
 <div className="max-w-7xl mx-auto">
 <div className="grid lg:grid-cols-2 gap-16 items-center">
 {/* Left: description */}
 <div>
 <p className="text-sm font-semibold text-primary dark:text-violet-400 mb-4 tracking-wide uppercase">
 Why OpusZen
 </p>
 <h2 id="why-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
 Built for teams that need control
 </h2>
 <p className="text-muted-foreground leading-relaxed">
 Multi-tenant API key management with per-key budgets, rate limits, usage tracking, and a full admin dashboard. Designed for resellers and teams.
 </p>
 </div>

 {/* Right: feature list */}
 <ul className="space-y-4" role="list">
 {features.map((feature) => (
 <li key={feature} className="flex items-start gap-3 p-4 rounded-xl bg-card dark:bg-card/80 border border-border/40 dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/40 transition-colors">
 <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-violet-400" aria-hidden="true">
 <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
 <path d="M20 6 9 17l-5-5" />
 </svg>
 </div>
 <span className="text-sm text-foreground font-medium leading-relaxed">
 {feature}
 </span>
 </li>
 ))}
 </ul>
 </div>
 </div>
 </section>
 )
}
