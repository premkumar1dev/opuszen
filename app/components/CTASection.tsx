import { Link } from 'react-router'
import { MagneticButton } from '@/components/ui/motion-footer'

export default function CTASection() {
  return (
  <section className="relative py-24 px-4 overflow-hidden" aria-labelledby="cta-heading">
  {/* Background gradient */}
  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-fuchsia-500/5 dark:from-primary/10 dark:via-background dark:to-fuchsia-500/10" aria-hidden="true" />

  {/* Decorative elements */}
  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" aria-hidden="true" />
  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/20 to-transparent" aria-hidden="true" />

  <div className="relative max-w-3xl mx-auto text-center">

  {/* Icon */}
  <div className="mb-8 inline-flex items-center justify-center">
  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 dark:from-primary dark:to-fuchsia-500 flex items-center justify-center shadow-2xl shadow-primary/30 dark:shadow-primary/40">
  <svg xmlns="http://www.w3.org/2000/svg" width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-white" aria-hidden="true">
  <path d="M12 20v2" />
  <path d="M12 2v2" />
  <path d="M17 20v2" />
  <path d="M17 2v2" />
  <path d="M2 12h2" />
  <path d="M2 17h2" />
  <path d="M2 7h2" />
  <path d="M20 12h2" />
  <path d="M20 17h2" />
  <path d="M20 7h2" />
  <path d="M7 20v2" />
  <path d="M7 2v2" />
  <rect x="4" y="4" width="16" height="16" rx="2" />
  <rect x="8" y="8" width="8" height="8" rx="1" />
  </svg>
  </div>
  </div>

  <h2 id="cta-heading" className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">
  Stop managing API keys manually
  </h2>
  <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10 leading-relaxed">
  Set up OpusZen in under a minute. No credit card, no vendor lock-in — just swap your base URL and go.
  </p>

  <MagneticButton
  as={Link}
  to="/docs"
  className="group relative inline-flex items-center justify-center whitespace-nowrap font-semibold text-primary-foreground bg-primary hover:bg-primary/95 disabled:pointer-events-none disabled:opacity-50 h-14 rounded-full px-10 py-4 text-lg gap-3 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  >
  <span>Get Started Free</span>
  <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1" aria-hidden="true">
  <path d="M5 12h14" />
  <path d="m12 5 7 7-7 7" />
  </svg>
  </MagneticButton>

 {/* Trust indicators */}
 <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground">
 <div className="flex items-center gap-2">
 <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 dark:text-emerald-400" aria-hidden="true">
 <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
 <path d="M22 4 12 14.01l-3-3" />
 </svg>
 No credit card required
 </div>
 <div className="flex items-center gap-2">
 <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 dark:text-emerald-400" aria-hidden="true">
 <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
 <path d="M22 4 12 14.01l-3-3" />
 </svg>
 Cancel anytime
 </div>
 </div>
 </div>
 </section>
 )
}
