import { motion } from "framer-motion";
import Hero from '../components/Hero'
import ModelCards from '../components/ModelCards'
import CompatibilityStrip from '../components/CompatibilityStrip'
import FeatureCards from '../components/FeatureCards'
import MigrationSection from '../components/MigrationSection'
import { ReadyIn60Seconds } from '../components/ReadyIn60Seconds'
import { WhyOpusZen } from '../components/WhyOpusZen'
import CTASection from '../components/CTASection'
import GettingStarted from '../components/GettingStarted'
import { Layout } from '../components/Layout'

export default function Home() {
 return (
 <Layout>
 <motion.div
 initial={{ opacity: 0, y: 16 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
 >
 <Hero />
 <ModelCards />
 <CompatibilityStrip />
 <FeatureCards />
 <MigrationSection />
 <ReadyIn60Seconds />
 <WhyOpusZen />
 <CTASection />
 <GettingStarted />
 </motion.div>
 </Layout>
 )
}
