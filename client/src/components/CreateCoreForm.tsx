import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, Dna } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateCharacter } from "@/hooks/use-characters";
import { CreateCharacterRequest } from "@shared/schema";

// Helper to generate a random mock genome
const generateRandomGenome = () => {
  const bases = ['A', 'T', 'C', 'G'];
  let genome = "";
  for(let i=0; i<40; i++) {
    genome += bases[Math.floor(Math.random() * bases.length)];
    if ((i+1) % 4 === 0 && i < 39) genome += "|";
  }
  return genome;
};

// Default random starting attributes
const generateStartingAttributes = () => ({
  strength: Math.floor(Math.random() * 5) + 8,
  dexterity: Math.floor(Math.random() * 5) + 8,
  constitution: Math.floor(Math.random() * 5) + 8,
  intelligence: Math.floor(Math.random() * 5) + 8,
  wisdom: Math.floor(Math.random() * 5) + 8,
  charisma: Math.floor(Math.random() * 5) + 8,
});

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  selfTitle: z.string().optional(),
});

export function CreateCoreForm() {
  const createCharacter = useCreateCharacter();
  const [genome] = useState(generateRandomGenome());
  
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      selfTitle: "Novice Soul",
    }
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const payload: CreateCharacterRequest = {
      name: data.name,
      selfTitle: data.selfTitle,
      genome: genome,
      attributes: generateStartingAttributes(),
      skills: [],
      chakras: {
        muladhara: 10,
        svadhisthana: 5,
        manipura: 5,
        anahata: 5,
        vishuddha: 5,
        ajna: 2,
        sahasrara: 1,
      },
      energy: 100,
    };
    
    createCharacter.mutate(payload);
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-2xl glass-panel relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 blur-3xl rounded-full" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/20 blur-3xl rounded-full" />

      <div className="relative z-10">
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/30"
          >
            <Dna className="w-8 h-8 text-primary" />
          </motion.div>
          <h2 className="text-3xl font-serif text-white mb-2">Initialize Core</h2>
          <p className="text-muted-foreground font-tech">Define your identity to begin the cycle.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs uppercase tracking-widest text-primary/80">Designation (Name)</Label>
            <Input 
              id="name" 
              {...register("name")}
              className="bg-black/40 border-primary/20 focus:border-primary focus:ring-primary/20 font-display text-lg tracking-wide"
              placeholder="e.g. Kael"
            />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="selfTitle" className="text-xs uppercase tracking-widest text-secondary/80">Self-Identification (Title)</Label>
            <Input 
              id="selfTitle" 
              {...register("selfTitle")}
              className="bg-black/40 border-secondary/20 focus:border-secondary focus:ring-secondary/20 font-serif italic text-lg"
              placeholder="e.g. Flame Walker"
            />
          </div>

          <div className="p-4 bg-black/30 rounded-lg border border-white/5">
            <h4 className="text-xs uppercase text-muted-foreground mb-2">Detected Genome Signature</h4>
            <div className="font-mono text-[10px] text-primary break-all opacity-70 tracking-tighter leading-tight">
              {genome}
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={createCharacter.isPending}
            className="w-full h-12 text-lg font-display uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-300"
          >
            {createCharacter.isPending ? (
              <span className="flex items-center gap-2"><Loader2 className="animate-spin" /> Materializing...</span>
            ) : (
              "Manifest Existence"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
