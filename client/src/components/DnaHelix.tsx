import { motion } from "framer-motion";
import { useMemo } from "react";

interface DnaHelixProps {
  genome: string;
}

export function DnaHelix({ genome }: DnaHelixProps) {
  const pairs = useMemo(() => {
    const safeGenome = genome || "ATCG";
    const result = [];
    const bases = safeGenome.replace(/[^ATCG]/g, '').split('');
    
    for (let i = 0; i < Math.min(bases.length, 20); i++) {
      const base1 = bases[i];
      let base2 = '';
      if (base1 === 'A') base2 = 'T';
      if (base1 === 'T') base2 = 'A';
      if (base1 === 'C') base2 = 'G';
      if (base1 === 'G') base2 = 'C';
      result.push([base1, base2]);
    }
    return result;
  }, [genome]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center py-4 overflow-hidden relative">
      <h3 className="absolute top-2 left-4 text-xs font-display text-muted-foreground uppercase tracking-widest">
        Последовательность Генома
      </h3>
      
      <div className="space-y-3 relative z-10 w-full max-w-[120px]">
        {pairs.map((pair, i) => (
          <motion.div
            key={i}
            className="flex items-center justify-between w-full h-2 relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
          >
            <motion.div 
              className="w-6 h-6 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center text-[8px] text-primary font-mono shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              animate={{ x: [0, 8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: i * 0.2 }}
            >
              {pair[0]}
            </motion.div>

            <div className="h-[1px] bg-primary/30 flex-1 mx-1 opacity-40" />

            <motion.div 
              className="w-6 h-6 rounded-full bg-secondary/40 border border-secondary/50 flex items-center justify-center text-[8px] text-secondary-foreground font-mono shadow-[0_0_10px_rgba(139,92,246,0.3)]"
              animate={{ x: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: i * 0.2 }}
            >
              {pair[1]}
            </motion.div>
          </motion.div>
        ))}
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
    </div>
  );
}
