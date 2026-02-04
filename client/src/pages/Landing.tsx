import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { ArrowRight, Fingerprint, Dna } from "lucide-react";

export default function Landing() {
  return (
    <Layout>
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* Hero Content */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-20 max-w-3xl px-6"
        >
          <div className="mb-6 flex justify-center">
            <span className="px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-display tracking-widest uppercase">
              System Online
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 leading-tight">
            Discover Your <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-secondary animate-pulse">True Essence</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto font-tech leading-relaxed">
            Forget classes. Embrace your genetic destiny. Awaken your chakras, absorb the energy of the world, and evolve beyond human limits.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="h-14 px-8 text-lg font-display uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-300">
              <a href="/api/login">
                Enter The Core <ArrowRight className="ml-2 w-5 h-5" />
              </a>
            </Button>
            
            <Button variant="outline" size="lg" className="h-14 px-8 font-display border border-primary/30 text-primary/80 hover:bg-primary/10" onClick={() => window.location.href = "/api/login-test"}>
              Test Login (Dev)
            </Button>
            
            <Button variant="ghost" size="lg" className="h-14 px-8 font-display border border-white/10 hover:bg-white/5">
              Read The Archives
            </Button>
          </div>
        </motion.div>

        {/* Decorative Elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Animated DNA Helix effect in background */}
          <div className="absolute left-10 top-20 opacity-10 hidden md:block">
            <Dna className="w-96 h-96 text-primary animate-pulse duration-[5000ms]" />
          </div>
          <div className="absolute right-10 bottom-20 opacity-10 hidden md:block">
            <Fingerprint className="w-96 h-96 text-secondary animate-pulse duration-[7000ms]" />
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-6xl mx-auto">
        {[
          { icon: Dna, title: "Genetic Core", desc: "Your DNA defines your potential. No rigid classes, only biological evolution." },
          { icon: Fingerprint, title: "Self-Defined", desc: "You choose your title. You forge your own path through the energy fields." },
          { icon: ArrowRight, title: "Energy Absorption", desc: "Travel to ancient sites. Absorb terrestrial energy. Power your chakras." },
        ].map((feature, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.2 }}
            className="glass-panel p-8 rounded-2xl border-t border-white/10"
          >
            <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center mb-4">
              <feature.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-serif font-bold mb-2 text-white">{feature.title}</h3>
            <p className="text-muted-foreground font-tech text-sm leading-relaxed">{feature.desc}</p>
          </motion.div>
        ))}
      </div>
    </Layout>
  );
}
