
const models = [
  {
  name: 'OpusLive Premium',
  id: 'opuslive-premium',
  description: 'Flagship — 1M context, long-horizon agentic coding',
  gradient: 'from-violet-500 to-purple-600 dark:from-violet-400 dark:to-purple-500',
  icon: '🧠',
  },
  {
  name: 'OpusLive Chat',
  id: 'opuslive-chat',
  description: 'Speed meets intelligence',
  gradient: 'from-primary to-indigo-500 dark:from-primary dark:to-indigo-400',
  icon: '⚡',
  },
  {
  name: 'OpusLive Fast',
  id: 'opuslive-fast',
  description: 'Fastest for high throughput',
  gradient: 'from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-400',
  icon: '🚀',
  },
]

export default function ModelCards() {
  return (
  <section className="relative py-24 px-4">
  <div className="max-w-7xl mx-auto">
  <div className="text-center mb-16">
  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
  The full OpusLive lineup
  </h2>
  <p className="text-muted-foreground max-w-lg mx-auto">
  Use the model that fits your task.
  </p>
  </div>

 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
 {models.map((model, index) => (
 <article
 key={model.id}
 className="group relative rounded-2xl border border-border/60 bg-card dark:bg-card/80 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 dark:hover:shadow-primary/10 hover:-translate-y-1 overflow-hidden"
 style={{ animationDelay: `${index * 100}ms` }}
 tabIndex={0}
 role="article"
 aria-label={`${model.name}: ${model.description}`}
 >
 {/* Top gradient bar */}
 <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${model.gradient} opacity-80 group-hover:opacity-100 transition-opacity`} aria-hidden="true" />

 {/* Glow on hover */}
 <div className={`absolute inset-0 bg-gradient-to-br ${model.gradient} opacity-0 group-hover:opacity-5 dark:group-hover:opacity-10 transition-opacity duration-300`} aria-hidden="true" />

 <div className="mt-4 relative z-10 p-5">
 <div className="flex items-center gap-3 mb-2">
 <span className="text-2xl" aria-hidden="true">{model.icon}</span>
 <h3 className="text-xl font-bold text-foreground">{model.name}</h3>
 </div>
 <code className="text-xs text-muted-foreground font-mono bg-muted/50 dark:bg-muted/20 px-2 py-1 rounded">{model.id}</code>
 <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{model.description}</p>
 </div>

 {/* Shimmer effect */}
 <div className="absolute inset-0 -z-10 overflow-hidden">
 <div className="absolute -left-full top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/5 animate-shimmer" />
 </div>
 </article>
 ))}
 </div>
 </div>
 </section>
 )
}
