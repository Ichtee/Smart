import { Navbar } from "@/components/smart/navbar";
import { Hero } from "@/components/smart/hero";
import { Features } from "@/components/smart/features";
import { Stats } from "@/components/smart/stats";
import { Testimonial } from "@/components/smart/testimonial";
import { CTA } from "@/components/smart/cta";
import { Footer } from "@/components/smart/footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Stats />
        <Testimonial />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
