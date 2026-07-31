import { LiquidButton, MetalButton } from "@/components/ui/liquid-glass-button";

export default function DemoButtons() {
 return (
 <div className="min-h-screen bg-background p-8">
 <div className="mx-auto max-w-4xl space-y-12">
 <h1 className="text-3xl font-bold text-foreground">
 Button Showcase
 </h1>

 <section className="space-y-4">
 <h2 className="text-xl font-semibold text-foreground">
 Liquid Glass Button
 </h2>
 <p className="text-muted-foreground">
 A glass-morphism button with SVG filter distortion and backdrop blur.
 </p>
 <div className="flex flex-wrap items-center gap-4">
 <LiquidButton variant="default">Liquid Glass</LiquidButton>
 <LiquidButton variant="destructive">Destructive</LiquidButton>
 </div>
 </section>

 <section className="space-y-4">
 <h2 className="text-xl font-semibold text-foreground">
 Metal Button Variants
 </h2>
 <p className="text-muted-foreground">
 Metallic-styled buttons with pressed, hover, and shine effects.
 </p>
 <div className="flex flex-wrap items-center gap-4">
 <MetalButton variant="default">Default</MetalButton>
 <MetalButton variant="primary">Primary</MetalButton>
 <MetalButton variant="success">Success</MetalButton>
 <MetalButton variant="error">Error</MetalButton>
 <MetalButton variant="gold">Gold</MetalButton>
 <MetalButton variant="bronze">Bronze</MetalButton>
 </div>
 </section>
 </div>
 </div>
 );
}
