import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAbsorbEnergy, useEnergyStatus } from "@/hooks/use-energy";
import { cn } from "@/lib/utils";

interface AbsorptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const REGIONS = [
  { id: "forest_ancient", name: "Древний Лес", color: "green", desc: "Изобилие жизненной энергии. Полезно для Сердечной Чакры." },
  { id: "volcano_dormant", name: "Спящий Вулкан", color: "red", desc: "Сырой жар земли. Укрепляет Корневую Чакру." },
  { id: "crystal_cave", name: "Хрустальные Пещеры", color: "indigo", desc: "Резонансные частоты. Проясняет Третий Глаз." },
  { id: "sky_sanctuary", name: "Небесное Святилище", color: "cyan", desc: "Чистый эфир. Усиливает Горловую Чакру." },
];

export function AbsorptionModal({ isOpen, onClose }: AbsorptionModalProps) {
  const absorbMutation = useAbsorbEnergy();
  const { data: absorptions } = useEnergyStatus();
  
  const isAbsorbing = absorptions?.some(a => !a.completed);

  const handleAbsorb = (regionId: string, color: string) => {
    absorbMutation.mutate({ regionId, energyColor: color }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
          >
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden border border-primary/20">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-serif text-white flex items-center gap-2">
                  <Zap className="text-accent" /> Резонанс Окружения
                </h3>
                <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/10" data-testid="button-close-modal">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {isAbsorbing ? (
                <div className="text-center py-10">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
                  />
                  <h4 className="text-xl font-display text-primary animate-pulse" data-testid="text-absorption-progress">Поглощение в процессе...</h4>
                  <p className="text-muted-foreground mt-2">Интеграция энергии окружения в ваше ядро.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {REGIONS.map((region) => (
                    <button
                      key={region.id}
                      onClick={() => handleAbsorb(region.id, region.color)}
                      disabled={absorbMutation.isPending}
                      className="group relative p-4 rounded-xl border border-white/5 bg-black/40 hover:bg-white/5 transition-all duration-300 text-left overflow-hidden"
                      data-testid={`button-region-${region.id}`}
                    >
                      <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 group-hover:w-full group-hover:opacity-10 opacity-0",
                        `bg-${region.color}-500`
                      )} />
                      
                      <div className="relative z-10 flex justify-between items-center">
                        <div>
                          <h4 className="font-display font-bold text-lg group-hover:text-primary transition-colors">
                            {region.name}
                          </h4>
                          <p className="text-sm text-muted-foreground font-tech">{region.desc}</p>
                        </div>
                        <MapPin className={cn(
                          "w-6 h-6 opacity-50 group-hover:opacity-100 transition-opacity",
                          `text-${region.color}-500`
                        )} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
