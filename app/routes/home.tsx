import Hero from '../components/Hero'
import ModelCards from '../components/ModelCards'
import { WhyOpusZen } from '../components/WhyOpusZen'
import { ReadyIn60Seconds } from '../components/ReadyIn60Seconds'
import CTASection from '../components/CTASection'
import { Layout } from '../components/Layout'

export default function Home() {
  return (
    <Layout>
      {/* Curtain Reveal Wrapper for Hero */}
      <div 
        className="relative h-[90vh] w-full"
        style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
      >
        <div className="fixed top-0 left-0 w-full h-[90vh] z-0 pointer-events-auto">
          <Hero />
        </div>
      </div>

      {/* Main scrolling content overlays the Hero */}
      <div className="relative z-10 bg-background shadow-[0_-20px_50px_rgba(0,0,0,0.15)] rounded-t-[2.5rem] border-t border-border/20 pt-8 dark:shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
        <ModelCards />
        <WhyOpusZen />
        <ReadyIn60Seconds />
        <CTASection />
      </div>
    </Layout>
  )
}