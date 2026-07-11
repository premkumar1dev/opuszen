import { useState } from 'react';

export function ReadyIn60Seconds() {
 const [host, setHost] = useState(() => {
 if (typeof window !== 'undefined') {
 return window.location.host;
 }
 return 'opuszen.shop';
 });

 const steps = [
 {
 number: '01',
 title: 'Get your API key',
 description: 'Your admin or reseller creates a key with budget and rate limits already configured.',
 icon: '🔑',
 },
 {
 number: '02',
 title: 'Set your base URL',
 description: `Point any Anthropic-compatible client to ${host}. Everything else stays the same.`,
 icon: '🔗',
 },
 {
 number: '03',
 title: 'Start building',
 description: 'Claude Code, Python SDK, cURL, Cursor — it all just works. Streaming included.',
 icon: '🚀',
 },
 ];

 return (
 <section className="relative py-24 px-4" aria-labelledby="steps-heading">
 <div className="max-w-4xl mx-auto">
 <div className="text-center mb-16">
 <h2 id="steps-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
 Ready in 60 seconds
 </h2>
 <p className="text-muted-foreground">
 Three steps. That's it.
 </p>
 </div>

 <ol className="space-y-0" role="list">
 {steps.map((step, index) => (
 <li
 key={step.number}
 className="flex gap-6 sm:gap-8 py-8 border-b border-border/50 dark:border-border/40 last:border-0 group transition-colors"
 style={{ animationDelay: `${index * 100}ms` }}
 >
 <div className="flex-shrink-0">
 <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20 dark:group-hover:shadow-primary/10 transition-all duration-300`}>
 {step.icon}
 </div>
 </div>
 <div className="flex-1 pt-1">
 <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
 <span className="text-4xl font-black text-primary/10 dark:text-primary/20 tabular-nums transition-colors group-hover:text-primary/20 dark:group-hover:text-primary/30">
 {step.number}
 </span>
 <div>
 <h3 className="text-lg font-semibold text-foreground transition-colors group-hover:text-primary dark:group-hover:text-violet-400">
 {step.title}
 </h3>
 <p className="text-muted-foreground text-sm leading-relaxed mt-1">
 {step.description}
 </p>
 </div>
 </div>
 </div>
 </li>
 ))}
 </ol>
 </div>
 </section>
 )
}
