import { motion } from "framer-motion";
import { type Character } from "@shared/schema";
import { cn } from "@/lib/utils";

const CHAKRAS_CONFIG = [
  { key: "sahasrara", label: "Коронная", color: "bg-purple-500", shadow: "shadow-purple-500/50" },
  { key: "ajna", label: "Третий Глаз", color: "bg-indigo-500", shadow: "shadow-indigo-500/50" },
  { key: "vishuddha", label: "Горловая", color: "bg-blue-500", shadow: "shadow-blue-500/50" },
  { key: "anahata", label: "Сердечная", color: "bg-green-500", shadow: "shadow-green-500/50" },
  { key: "manipura", label: "Солнечное Сплетение", color: "bg-yellow-500", shadow: "shadow-yellow-500/50" },
  { key: "svadhisthana", label: "Сакральная", color: "bg-orange-500", shadow: "shadow-orange-500/50" },
  { key: "muladhara", label: "Корневая", color: "bg-red-500", shadow: "shadow-red-500/50" },
] as const;

interface ChakraVisualizerProps {
  chakras: Character["chakras"];
}

export function ChakraVisualizer({ chakras }: ChakraVisualizerProps) {
  return (
    <div className="relative flex flex-col items-center justify-center py-12 gap-6 h-full min-h-[500px]">
      <div className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500/20 via-green-500/20 to-red-500/20 blur-[1px]" />
      
      {CHAKRAS_CONFIG.map((chakra, index) => {
        const value = chakras[chakra.key as keyof typeof chakras] || 0;
        const size = 30 + (value * 0.4);
        const opacity = 0.3 + (value / 100 * 0.7);
        
        return (
          <motion.div
            key={chakra.key}
            className="relative z-10 flex items-center justify-center group cursor-pointer"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
          >
            <div className="absolute right-full mr-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded text-xs whitespace-nowrap border border-white/10 pointer-events-none">
              <span className="font-display font-bold uppercase text-white/80">{chakra.label}</span>
              <span className="ml-2 text-primary">{value}%</span>
            </div>

            <motion.div
              className={cn(
                "rounded-full backdrop-blur-sm transition-all duration-500",
                chakra.color,
                chakra.shadow
              )}
              style={{
                width: size,
                height: size,
                opacity,
                boxShadow: `0 0 ${value / 3}px var(--tw-shadow-color)`,
              }}
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 4 + (index * 0.5),
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
