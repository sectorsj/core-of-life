import { useState, useCallback } from "react";
import { useCharacter, useUpdateCharacter } from "@/hooks/use-characters";
import { useEnergyStatus } from "@/hooks/use-energy";
import { useWorldState } from "@/hooks/use-world";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { CreateCoreForm } from "@/components/CreateCoreForm";
import { AbsorptionModal } from "@/components/AbsorptionModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Edit2, Check, Zap, Activity, Shield, Brain, Swords, Wind, Sparkles, Eye, Camera, Wand2, Mountain, Search, Bird, Bolt, UserRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

import regionForest from "../assets/images/region-forest.png";
import regionVolcano from "../assets/images/region-volcano.png";
import regionCrystal from "../assets/images/region-crystal.png";
import regionSky from "../assets/images/region-sky.png";
import regionSwamp from "../assets/images/region-swamp.png";
import regionDesert from "../assets/images/region-desert.png";
import regionAbyss from "../assets/images/region-abyss.png";

const REGION_IMAGES: Record<string, string> = {
  forest_ancient: regionForest,
  volcano_dormant: regionVolcano,
  crystal_cave: regionCrystal,
  sky_sanctuary: regionSky,
  swamp_mist: regionSwamp,
  desert_crimson: regionDesert,
  abyss_deep: regionAbyss,
};

const REGION_LABELS: Record<string, string> = {
  forest_ancient: "Древний Лес",
  volcano_dormant: "Спящий Вулкан",
  crystal_cave: "Хрустальные Пещеры",
  sky_sanctuary: "Небесное Святилище",
  swamp_mist: "Туманное Болото",
  desert_crimson: "Багряная Пустыня",
  abyss_deep: "Глубокая Бездна",
};

const REGION_FLAVOR: Record<string, string> = {
  forest_ancient: "Первозданный лес, наполненный жизненной энергией. Древние деревья хранят память тысячелетий.",
  volcano_dormant: "Вулкан, излучающий сырой жар земли. Лава течёт по венам горы, словно кровь мира.",
  crystal_cave: "Пещеры, резонирующие кристаллическими частотами. Каждый кристалл хранит эхо забытых мыслей.",
  sky_sanctuary: "Парящее святилище чистого эфира. Здесь небо и земля меняются местами.",
  swamp_mist: "Токсичные болота, окутанные вечным туманом. Смерть и жизнь переплетаются в танце.",
  desert_crimson: "Бескрайние красные пески под пылающим небом. Солнце выжигает всё, кроме сильнейших.",
  abyss_deep: "Бездонная пустота, где реальность истончается. Здесь даже тени боятся темноты.",
};

const ATTRIBUTE_LABELS: Record<string, { label: string; icon: typeof Shield }> = {
  strength: { label: "Сила", icon: Swords },
  dexterity: { label: "Ловкость", icon: Wind },
  constitution: { label: "Выносливость", icon: Shield },
  intelligence: { label: "Интеллект", icon: Brain },
  wisdom: { label: "Мудрость", icon: Eye },
  charisma: { label: "Харизма", icon: Sparkles },
};

const CHAKRA_LABELS: Record<string, { label: string; color: string }> = {
  muladhara: { label: "Муладхара", color: "#ef4444" },
  svadhisthana: { label: "Свадхистхана", color: "#f97316" },
  manipura: { label: "Манипура", color: "#eab308" },
  anahata: { label: "Анахата", color: "#22c55e" },
  vishuddha: { label: "Вишуддха", color: "#06b6d4" },
  ajna: { label: "Аджна", color: "#6366f1" },
  sahasrara: { label: "Сахасрара", color: "#a855f7" },
};

const CAMERA_ICONS: Record<string, typeof Mountain> = {
  panorama: Mountain,
  closeup: Search,
  aerial: Bird,
  dramatic: Bolt,
  pov: UserRound,
};

function getTimeCategory(timeOfDay: number): string {
  if (timeOfDay >= 5 && timeOfDay < 12) return "morning";
  if (timeOfDay >= 12 && timeOfDay < 17) return "day";
  if (timeOfDay >= 17 && timeOfDay < 21) return "evening";
  return "night";
}

export default function CharacterView() {
  const { data: character, isLoading } = useCharacter();
  const updateCharacter = useUpdateCharacter();
  const { data: absorptions } = useEnergyStatus();
  const { data: physicsState } = useWorldState();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showAbsorption, setShowAbsorption] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [selectedAngle, setSelectedAngle] = useState("panorama");
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [showCameraPanel, setShowCameraPanel] = useState(false);

  const { data: cameraAngles } = useQuery<{ id: string; label: string }[]>({
    queryKey: ["/api/scene/angles"],
  });

  const generateScene = useMutation({
    mutationFn: async (params: { regionId: string; cameraAngle: string; timeOfDay: string; weather: string }) => {
      const res = await apiRequest("POST", "/api/scene/generate", params);
      return res.json() as Promise<{ imageBase64: string; cached: boolean; prompt: string }>;
    },
    onSuccess: (data) => {
      setAiImage(`data:image/png;base64,${data.imageBase64}`);
    },
  });

  const handleGenerate = useCallback(() => {
    if (!character?.regionId) return;
    const timeCategory = getTimeCategory(physicsState?.timeOfDay ?? 12);
    const weatherType = (physicsState?.weather as any)?.type || "clear";
    generateScene.mutate({
      regionId: character.regionId,
      cameraAngle: selectedAngle,
      timeOfDay: timeCategory,
      weather: weatherType,
    });
  }, [character?.regionId, selectedAngle, physicsState, generateScene]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground font-display tracking-widest animate-pulse" data-testid="text-loading">СИНХРОНИЗАЦИЯ БИОМЕТРИИ...</p>
        </div>
      </Layout>
    );
  }

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
  const rid = character.regionId ?? "forest_ancient";
  const regionImage = aiImage || REGION_IMAGES[rid] || regionForest;
  const regionName = REGION_LABELS[rid] || rid;
  const regionFlavor = REGION_FLAVOR[rid] || "";

  const timeOfDay = physicsState?.timeOfDay ?? 12;
  const isNight = timeOfDay < 6 || timeOfDay >= 20;

  return (
    <Layout>
      <div className="relative -mx-4 -mt-8 min-h-[calc(100vh-8rem)]" data-testid="character-view">
        <div className="absolute inset-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img
              key={regionImage}
              src={regionImage}
              alt={regionName}
              className="w-full h-full object-cover"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{ filter: isNight ? "brightness(0.4) saturate(0.7)" : "brightness(0.7) saturate(0.9)" }}
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/40" />
        </div>

        <div className="relative z-10 px-4 pt-4 pb-8 min-h-[calc(100vh-8rem)] flex flex-col">

          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 flex-wrap"
            >
              <Badge variant="outline" className="border-white/20 text-white/60 font-tech text-xs" data-testid="badge-region-name">
                {regionName}
              </Badge>
              {activeAbsorption && (
                <Badge variant="outline" className="border-accent/40 text-accent font-tech text-xs animate-pulse" data-testid="badge-absorbing">
                  <Activity className="w-3 h-3 mr-1" />
                  Поглощение
                </Badge>
              )}
              {aiImage && (
                <Badge variant="outline" className="border-primary/40 text-primary font-tech text-xs" data-testid="badge-ai-generated">
                  <Wand2 className="w-3 h-3 mr-1" />
                  ИИ
                </Badge>
              )}
            </motion.div>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCameraPanel(!showCameraPanel)}
                className="text-white/60 text-xs"
                data-testid="button-toggle-camera"
              >
                <Camera className="w-3.5 h-3.5 mr-1" />
                Камера
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowStats(!showStats)}
                className="text-white/60 text-xs"
                data-testid="button-toggle-stats"
              >
                {showStats ? "Скрыть" : "Показать"} статы
              </Button>
              <Link href="/status">
                <Button size="sm" variant="ghost" className="text-white/60 text-xs" data-testid="button-full-status">
                  Полный статус
                </Button>
              </Link>
            </div>
          </div>

          <AnimatePresence>
            {showCameraPanel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="bg-black/70 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                  <h3 className="font-display text-xs uppercase tracking-widest text-white/40 mb-3">
                    <Camera className="w-3.5 h-3.5 inline mr-1" />
                    Ракурс камеры
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(cameraAngles || []).map((angle) => {
                      const AngleIcon = CAMERA_ICONS[angle.id];
                      return (
                        <Button
                          key={angle.id}
                          size="sm"
                          variant={selectedAngle === angle.id ? "secondary" : "ghost"}
                          onClick={() => setSelectedAngle(angle.id)}
                          className="text-xs text-white/70"
                          data-testid={`button-angle-${angle.id}`}
                        >
                          {AngleIcon && <AngleIcon className="w-3.5 h-3.5 mr-1.5" />}
                          {angle.label}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      onClick={handleGenerate}
                      disabled={generateScene.isPending}
                      className="bg-primary/80 text-primary-foreground"
                      data-testid="button-generate-scene"
                    >
                      {generateScene.isPending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Генерация...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                          Сгенерировать вид
                        </>
                      )}
                    </Button>
                    {aiImage && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAiImage(null)}
                        className="text-white/40 text-xs"
                        data-testid="button-reset-image"
                      >
                        Сбросить
                      </Button>
                    )}
                    {generateScene.isPending && (
                      <span className="text-xs text-white/30 font-tech">Это может занять ~15 сек...</span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 flex items-end">
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6">

              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="lg:col-span-4 space-y-4"
              >
                <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                  <div className="mb-4">
                    <h1 className="text-3xl font-serif font-bold text-white" data-testid="text-character-name">{character.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                      {isEditingTitle ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder={character.selfTitle || "Титул"}
                            className="h-7 bg-black/50 border-primary/50 text-primary w-40 text-sm"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && handleTitleUpdate()}
                            data-testid="input-self-title"
                          />
                          <Button size="icon" variant="ghost" onClick={handleTitleUpdate} className="text-primary" data-testid="button-save-title">
                            <Check className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-1 cursor-pointer group"
                          onClick={() => { setNewTitle(character.selfTitle || ""); setIsEditingTitle(true); }}
                          data-testid="button-edit-title"
                        >
                          <span className="text-primary/80 italic text-sm font-tech">{character.selfTitle || "Безымянная Душа"}</span>
                          <Edit2 className="w-3 h-3 text-primary/40 invisible group-hover:visible" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2 text-amber-400" data-testid="text-energy">
                      <Zap className={`w-4 h-4 fill-amber-400 ${activeAbsorption ? "animate-pulse" : ""}`} />
                      <span className="font-bold font-tech">{character.energy}</span>
                      <span className="text-xs text-amber-400/60">Энергия</span>
                      {activeAbsorption && (
                        <motion.span
                          className="text-xs font-bold font-tech text-green-400"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: [0.4, 1, 0.4], y: [4, 0, 4] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          data-testid="text-energy-gain"
                        >
                          +{activeAbsorption.durationMinutes * 2}
                        </motion.span>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => setShowAbsorption(true)}
                    className="w-full bg-secondary/80 text-secondary-foreground border border-white/5"
                    data-testid="button-absorb-energy"
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    Поглотить Энергию
                  </Button>
                </div>

                <AnimatePresence>
                  {showStats && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl p-5 overflow-hidden"
                    >
                      <h3 className="font-display text-xs uppercase tracking-widest text-white/40 mb-3">Атрибуты</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(character.attributes).map(([key, value]) => {
                          const attr = ATTRIBUTE_LABELS[key];
                          if (!attr) return null;
                          const Icon = attr.icon;
                          return (
                            <div key={key} className="flex items-center gap-2 text-sm" data-testid={`stat-${key}`}>
                              <Icon className="w-3.5 h-3.5 text-white/30" />
                              <span className="text-white/50 text-xs">{attr.label}</span>
                              <span className="text-white font-bold font-tech ml-auto">{value as number}</span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="lg:col-span-4 flex flex-col items-center justify-end"
              >
                <div className="text-center max-w-md">
                  <p className="text-white/50 text-sm italic leading-relaxed font-serif" data-testid="text-region-flavor">
                    {regionFlavor}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="lg:col-span-4 space-y-4"
              >
                <AnimatePresence>
                  {showStats && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl p-5 overflow-hidden"
                    >
                      <h3 className="font-display text-xs uppercase tracking-widest text-white/40 mb-3">Чакры</h3>
                      <div className="space-y-2">
                        {Object.entries(character.chakras).map(([key, value]) => {
                          const chakra = CHAKRA_LABELS[key];
                          if (!chakra) return null;
                          const level = value as number;
                          const maxLevel = 10;
                          const isAbsorbing = !!activeAbsorption;
                          return (
                            <div key={key} className="flex items-center gap-3" data-testid={`chakra-${key}`}>
                              <motion.div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: chakra.color, boxShadow: `0 0 6px ${chakra.color}` }}
                                animate={isAbsorbing ? { boxShadow: [`0 0 6px ${chakra.color}`, `0 0 14px ${chakra.color}`, `0 0 6px ${chakra.color}`] } : {}}
                                transition={isAbsorbing ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
                              />
                              <span className="text-xs text-white/50 w-24">{chakra.label}</span>
                              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: chakra.color }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(level / maxLevel) * 100}%` }}
                                  transition={{ duration: 1, delay: 0.5 }}
                                />
                                {isAbsorbing && (
                                  <motion.div
                                    className="absolute inset-0 rounded-full"
                                    style={{ background: `linear-gradient(90deg, transparent 60%, ${chakra.color})` }}
                                    animate={{ opacity: [0, 0.6, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                  />
                                )}
                              </div>
                              <span className="text-xs font-tech text-white/70 w-6 text-right">{level}</span>
                              {isAbsorbing && (
                                <motion.span
                                  className="text-xs font-tech text-green-400 w-4"
                                  animate={{ opacity: [0.3, 1, 0.3] }}
                                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                >
                                  +
                                </motion.span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {character.skills && character.skills.length > 0 && (
                  <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                    <h3 className="font-display text-xs uppercase tracking-widest text-white/40 mb-3">Навыки</h3>
                    <div className="flex flex-wrap gap-2">
                      {(character.skills as string[]).map((skill, i) => (
                        <Badge key={i} variant="outline" className="border-white/10 text-white/60 text-xs" data-testid={`skill-${i}`}>
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {activeAbsorption && (
                  <motion.div
                    className="bg-black/60 backdrop-blur-sm border border-accent/20 rounded-xl p-5"
                    animate={{ borderColor: ["rgba(var(--accent), 0.2)", "rgba(var(--accent), 0.5)", "rgba(var(--accent), 0.2)"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                        <span className="text-accent text-sm font-bold" data-testid="text-absorbing">
                          Резонанс: {REGION_LABELS[activeAbsorption.regionId] || activeAbsorption.regionId}
                        </span>
                      </div>
                      <motion.span
                        className="text-sm font-bold font-tech text-green-400"
                        animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        data-testid="text-resonance-gain"
                      >
                        +{activeAbsorption.durationMinutes * 2} Энергия
                      </motion.span>
                    </div>
                    <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-accent rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: activeAbsorption.durationMinutes * 60, ease: "linear" }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {activeAbsorption.durationMinutes} мин. поглощение
                    </p>
                  </motion.div>
                )}
              </motion.div>

            </div>
          </div>

        </div>
      </div>

      <AbsorptionModal isOpen={showAbsorption} onClose={() => setShowAbsorption(false)} />
    </Layout>
  );
}
