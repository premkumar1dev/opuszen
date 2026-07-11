import { useState, useRef, useEffect, useCallback } from 'react'
import { NavLink, useLocation } from 'react-router'

export function Layout({ children }: { children: React.ReactNode }) {
 const [mobileOpen, setMobileOpen] = useState(false)
 const [darkMode, setDarkMode] = useState(() => {
 if (typeof window !== 'undefined') {
 const saved = localStorage.getItem('dark-mode')
 if (saved !== null) return JSON.parse(saved)
 return window.matchMedia('(prefers-color-scheme: dark)').matches
 }
 return false
 })
 const mobileNavRef = useRef<HTMLElement>(null)
 const location = useLocation()
 const loginUrl = '/auth/login';

 // Apply dark mode class to html element
 useEffect(() => {
 if (darkMode) {
 document.documentElement.classList.add('dark')
 } else {
 document.documentElement.classList.remove('dark')
 }
 localStorage.setItem('dark-mode', JSON.stringify(darkMode))
 }, [darkMode])

 // Close mobile nav on route change
 useEffect(() => {
 setMobileOpen(false)
 }, [location])

 // Close on Escape key
 useEffect(() => {
 function handleKeyDown(e: KeyboardEvent) {
 if (e.key === 'Escape') {
 setMobileOpen(false)
 }
 }
 if (mobileOpen) {
 document.addEventListener('keydown', handleKeyDown)
 return () => document.removeEventListener('keydown', handleKeyDown)
 }
 }, [mobileOpen])

 // Lock body scroll when menu open
 useEffect(() => {
 if (mobileOpen) {
 document.body.style.overflow = 'hidden'
 } else {
 document.body.style.overflow = ''
 }
 return () => {
 document.body.style.overflow = ''
 }
 }, [mobileOpen])

 const toggleMobile = useCallback(() => {
 setMobileOpen((prev) => !prev)
 }, [])

 const toggleTheme = useCallback(() => {
 setDarkMode((prev: boolean) => !prev)
 }, [])

 return (
 <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
 {/* Skip to main content link for accessibility */}
 <a
 href="#main-content"
 className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
 >
 Skip to main content
 </a>

 <header className="fixed top-0 z-50 w-full backdrop-blur-xl bg-background/80 dark:bg-background/80 border-b border-border">
 <div className="mx-auto max-w-7xl px-4 sm:px-6">
 <nav className="flex items-center h-14">
 {/* Left - Logo */}
 <div className="pl-2 flex items-center">
 <NavLink
 to="/"
 className="flex items-center gap-3 font-bold text-foreground tracking-tight text-[16px] hover:opacity-70 transition-opacity cursor-pointer"
 aria-label="Opuszen home"
 >
 <img
 src="/logo.png"
 alt="Opuszen"
 className="w-9 h-9"
 />
 <span>Opuszen</span>
 </NavLink>
 </div>

 {/* Spacer */}
 <div className="flex-1" />

 {/* Center - Desktop Nav */}
 <div className="hidden md:flex items-center gap-8">
 <NavLink
 to="/docs"
 className="text-sm font-medium transition-colors text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded px-2 py-1"
 >
 Documentation
 </NavLink>
 <NavLink
 to="/status"
 className="text-sm font-medium transition-colors text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded px-2 py-1"
 >
 Status
 </NavLink>
 <a
 href={loginUrl}
 className="text-sm font-medium transition-colors text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded px-2 py-1"
 >
 Login
 </a>
 <NavLink
 to="/key-status"
 className="text-sm font-semibold bg-primary text-primary-foreground px-5 py-1.5 rounded-full hover:bg-primary/90 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
 >
 Check Usage
 </NavLink>
 </div>

 {/* Right - Actions */}
 <div className="flex items-center gap-2 pr-2">
 {/* Theme toggle */}
 <button
 onClick={toggleTheme}
 className="relative p-2 rounded-full bg-muted dark:bg-muted/50 hover:bg-muted/80 dark:hover:bg-muted transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background group"
 aria-label="Toggle theme"
 >
 <div className="relative w-5 h-5">
 {/* Sun icon - visible in light mode */}
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={18}
 height={18}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 className={`absolute inset-0 text-amber-500 transition-all duration-500 ease-in-out ${
 darkMode
 ? 'opacity-0 rotate-90 scale-0'
 : 'opacity-100 rotate-0 scale-100'
 }`}
 aria-hidden="true"
 >
 <circle cx={12} cy={12} r={5} />
 <line x1={12} y1={1} x2={12} y2={3} />
 <line x1={12} y1={21} x2={12} y2={23} />
 <line x1={4.22} y1={4.22} x2={5.64} y2={5.64} />
 <line x1={18.36} y1={18.36} x2={19.78} y2={19.78} />
 <line x1={1} y1={12} x2={3} y2={12} />
 <line x1={21} y1={12} x2={23} y2={12} />
 <line x1={4.22} y1={19.78} x2={5.64} y2={18.36} />
 <line x1={18.36} y1={5.64} x2={19.78} y2={4.22} />
 </svg>

 {/* Moon icon - visible in dark mode */}
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={18}
 height={18}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 className={`absolute inset-0 text-slate-300 transition-all duration-500 ease-in-out ${
 darkMode
 ? 'opacity-100 rotate-0 scale-100'
 : 'opacity-0 -rotate-90 scale-0'
 }`}
 aria-hidden="true"
 >
 <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
 </svg>
 </div>

 {/* Hover glow */}
 <div className="absolute inset-0 rounded-full bg-primary/20 dark:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md" />
 </button>

 {/* Mobile hamburger */}
 <button
 className="md:hidden p-2 rounded-full hover:bg-muted dark:hover:bg-muted/50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
 onClick={toggleMobile}
 aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
 aria-expanded={mobileOpen}
 aria-controls="mobile-nav"
 >
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={20}
 height={20}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="transition-all duration-200"
 aria-hidden="true"
 >
 {mobileOpen ? (
 <path d="M18 6 6 18" />
 ) : (
 <>
 <path d="M4 6h16" />
 <path d="M4 12h16" />
 <path d="M4 18h16" />
 </>
 )}
 </svg>
 </button>
 </div>
 </nav>
 </div>
 </header>

 {/* Mobile overlay */}
 <div
 className={`fixed inset-0 z-[60] bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
 mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
 }`}
 onClick={() => setMobileOpen(false)}
 aria-hidden="true"
 />

 {/* Mobile slide-out drawer */}
 <aside
 id="mobile-nav"
 ref={mobileNavRef}
 className={`fixed top-0 right-0 z-[70] h-full w-[280px] bg-background dark:bg-background/98 border-l border-border shadow-2xl transform transition-transform duration-300 ease-out md:hidden ${
 mobileOpen ? 'translate-x-0' : 'translate-x-full'
 }`}
 role="dialog"
 aria-modal="true"
 aria-label="Mobile navigation"
 >
 {/* Drawer handle bar */}
 <div className="flex justify-center pt-3 pb-2" aria-hidden="true">
 <div className="w-8 h-1.5 rounded-full bg-gradient-to-r from-primary to-violet-500" />
 </div>

 {/* Close button */}
 <div className="flex justify-end px-4">
 <button
 onClick={() => setMobileOpen(false)}
 className="p-2 cursor-pointer rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 aria-label="Close navigation menu"
 >
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={20}
 height={20}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="h-5 w-5"
 aria-hidden="true"
 >
 <path d="M18 6 6 18" />
 <path d="m6 6 12 12" />
 </svg>
 </button>
 </div>

 {/* Nav links */}
 <nav className="flex flex-col px-4 py-6 gap-1">
 <NavLink
 to="/docs"
 className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium text-foreground hover:bg-primary/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={18}
 height={18}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="text-primary"
 aria-hidden="true"
 >
 <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
 </svg>
 Documentation
 </NavLink>
 <NavLink
 to="/status"
 className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium text-foreground hover:bg-primary/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={18}
 height={18}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="text-primary"
 aria-hidden="true"
 >
 <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
 </svg>
 Status
 </NavLink>
 <a
 href={loginUrl}
 className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium text-foreground hover:bg-primary/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={18}
 height={18}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="text-primary"
 aria-hidden="true"
 >
 <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
 <polyline points="10 17 15 12 10 7" />
 <line x1="15" y1="12" x2="3" y2="12" />
 </svg>
 Login
 </a>

 {/* Divider */}
 <div className="my-2 border-t border-border" aria-hidden="true" />

 <NavLink
 to="/key-status"
 className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={18}
 height={18}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="text-primary-foreground"
 aria-hidden="true"
 >
 <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
 <path d="M7 11V7a5 5 0 0 1 10 0v4" />
 </svg>
 Check Usage
 </NavLink>
 </nav>
 </aside>

 <main id="main-content" className="pt-20" tabIndex={-1}>
 {children}
 </main>

 <footer className="border-t border-border py-10 px-4 mt-16">
 <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
 <div className="flex items-center gap-3">
 <img
 src="/logo.png"
 alt="Opuszen"
 className="w-8 h-8"
 />
 <div>
 <span className="text-sm font-bold text-foreground">Opuszen</span>
 <span className="text-xs text-muted-foreground ml-2">Anthropic-compatible API gateway</span>
 </div>
 </div>
 <nav className="flex items-center gap-5 text-xs text-muted-foreground" aria-label="Footer navigation">
 <NavLink to="/docs" className="hover:text-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">Docs</NavLink>
 <NavLink to="/key-status" className="hover:text-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">Usage</NavLink>
 <NavLink to="/status" className="hover:text-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">Status</NavLink>
 <NavLink to="/terms" className="hover:text-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">Terms</NavLink>
 <NavLink to="/privacy" className="hover:text-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">Privacy</NavLink>
 </nav>
 </div>
 </footer>
 </div>
 )
}
