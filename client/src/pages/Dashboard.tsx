import { useState } from "react";
import { useCharacter, useUpdateCharacter } from "@/hooks/use-characters";
import { useEnergyStatus } from "@/hooks/use-energy";
import { Layout } from "@/components/Layout";
import { CreateCoreForm } from "@/components/CreateCoreForm";
import { ChakraVisualizer } from "@/components/ChakraVisualizer";
import { DnaHelix } from "@/components/DnaHelix";
import { AbsorptionModal } from "@/components/AbsorptionModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Edit2, Check, Zap, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: character, isLoading } = useCharacter();
  const updateCharacter = useUpdateCharacter();
  const { data: absorptions } = useEnergyStatus();
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showAbsorption, setShowAbsorption] = useState(false);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground font-display tracking-widest animate-pulse">SYNCING BIOMETRICS...</p>
        </div>
      </Layout>
    );
  }

  // If no character, show creation form
  if (!character) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
          <CreateCoreForm />
        </div>
      </Layout>
    );
  }

  const handleTitleUpdate = () => {
    if (newTitle.trim()) {
      updateCharacter.mutate({ id: character.id, selfTitle: newTitle });
    }
    setIsEditingTitle(false);
  };

  const activeAbsorption = absorptions?.find(a => !a.completed);

  return (
    <Layout>
      {/* Header Info */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-white mb-2">{character.name}</h1>
          
          <div className="flex items-center gap-2 text-muted-foreground font-tech text-lg">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={character.selfTitle || "Self Title"}
                  className="h-8 bg-black/50 border-primary/50 text-primary w-48"
                  autoFocus
                />
                <Button size="sm" variant="ghost" onClick={handleTitleUpdate} className="h-8 w-8 p-0 text-primary">
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setNewTitle(character.selfTitle || ""); setIsEditingTitle(true); }}>
                <span className="text-primary italic">{character.selfTitle || "Untitled Soul"}</span>
                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              </div>
            )}
            <span className="text-white/20">|</span>
            <span className="flex items-center gap-1 text-accent">
              <Zap className="w-4 h-4 fill-accent" />
              {character.energy} Energy
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={() => setShowAbsorption(true)}
            className="bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-white/5 shadow-lg shadow-purple-900/20"
          >
            <Activity className="w-4 h-4 mr-2" />
            Absorb Energy
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        
        {/* Left Column: Stats & DNA */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 space-y-6"
        >
          {/* Attributes Card */}
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-20">
              <Activity className="w-12 h-12" />
            </div>
            <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-4">Physiological Attributes</h3>
            <div className="space-y-3 font-mono text-sm">
              {Object.entries(character.attributes).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center group hover:bg-white/5 p-1 rounded transition-colors">
                  <span className="capitalize text-white/70">{key}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-black/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary/60 group-hover:bg-primary transition-all duration-500" 
                        style={{ width: `${(value as number) * 5}%` }}
                      />
                    </div>
                    <span className="text-primary font-bold w-6 text-right">{value as number}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DNA Card */}
          <div className="glass-panel p-6 rounded-2xl h-[400px]">
            <DnaHelix genome={character.genome} />
          </div>
        </motion.div>

        {/* Center Column: Chakra Visualizer */}
        <div className="lg:col-span-6 relative">
          <div className="absolute inset-0 bg-black/40 rounded-3xl border border-white/5 -z-10" />
          <ChakraVisualizer chakras={character.chakras} />
        </div>

        {/* Right Column: Status & Active Effects */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 space-y-6"
        >
          {/* Active Absorption Status */}
          <div className="glass-panel p-6 rounded-2xl border-l-2 border-l-accent">
            <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-4">Resonance Status</h3>
            {activeAbsorption ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                  <span className="text-accent font-bold">Absorbing: {activeAbsorption.regionId.split('_').join(' ')}</span>
                </div>
                <div className="h-2 bg-black/50 rounded-full overflow-hidden w-full">
                  <motion.div 
                    className="h-full bg-accent"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 15, repeat: Infinity }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Synchronizing energetic frequencies...</p>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No active resonance.</p>
                <Button variant="link" onClick={() => setShowAbsorption(true)} className="text-primary text-xs">
                  Initiate Connection
                </Button>
              </div>
            )}
          </div>

          {/* Skills (Placeholder) */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-4">Awakened Skills</h3>
            {character.skills && character.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(character.skills as string[]).map((skill, i) => (
                  <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs hover:border-primary/50 transition-colors cursor-default">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No skills awakened yet. Develop your chakras to unlock potential.</p>
            )}
          </div>
        </motion.div>
      </div>

      <AbsorptionModal isOpen={showAbsorption} onClose={() => setShowAbsorption(false)} />
    </Layout>
  );
}
