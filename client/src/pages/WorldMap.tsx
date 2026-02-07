import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/Layout";
import { useRegions, useWorldState, useEntities, useTravel } from "@/hooks/use-world";
import { useCharacter } from "@/hooks/use-characters";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Compass, Sun, Moon, Cloud, CloudRain, CloudLightning, Wind, Thermometer, Footprints, X, Skull, Heart, Zap } from "lucide-react";
import type { Region, Entity } from "@shared/schema";

const WEATHER_ICONS: Record<string, typeof Sun> = {
  clear: Sun,
  rain: CloudRain,
  storm: CloudLightning,
  cloudy: Cloud,
};

const BIOME_GRADIENTS: Record<string, string> = {
  forest: "from-green-900/80 to-green-700/40",
  volcanic: "from-red-900/80 to-orange-700/40",
  underground: "from-indigo-900/80 to-purple-700/40",
  aerial: "from-cyan-900/80 to-blue-700/40",
  swamp: "from-emerald-900/80 to-yellow-900/40",
  desert: "from-amber-900/80 to-orange-800/40",
  abyss: "from-slate-900/80 to-indigo-950/40",
};

const WEATHER_TYPE_RU: Record<string, string> = {
  clear: "Ясно",
  rain: "Дождь",
  storm: "Шторм",
  cloudy: "Облачно",
  fog: "Туман",
  snow: "Снег",
};

const ENTITY_STATE_RU: Record<string, string> = {
  idle: "Покой",
  moving: "Движение",
  aggressive: "Агрессия",
  fleeing: "Бегство",
  dead: "Мертв",
};

const ENTITY_TYPE_RU: Record<string, string> = {
  creature: "Существо",
  object: "Объект",
  hazard: "Опасность",
};

const ENERGY_TYPE_RU: Record<string, string> = {
  life: "Жизнь",
  fire: "Огонь",
  psychic: "Психика",
  aether: "Эфир",
  death: "Смерть",
  solar: "Солнце",
  void: "Пустота",
  neutral: "Нейтральная",
};

const SEASON_RU: Record<string, string> = {
  spring: "Весна",
  summer: "Лето",
  autumn: "Осень",
  winter: "Зима",
};

function getTimeLabel(time: number): string {
  if (time >= 5 && time < 12) return "Утро";
  if (time >= 12 && time < 17) return "День";
  if (time >= 17 && time < 21) return "Вечер";
  return "Ночь";
}

function formatTime(time: number): string {
  const hours = Math.floor(time);
  const minutes = Math.floor((time - hours) * 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export default function WorldMap() {
  const { data: regions, isLoading: regionsLoading } = useRegions();
  const { data: worldState } = useWorldState();
  const { data: character } = useCharacter();
  const { data: allEntities } = useEntities();
  const travel = useTravel();

  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [viewOffset, setViewOffset] = useState({ x: 400, y: 400 });

  if (regionsLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground font-display tracking-widest animate-pulse" data-testid="text-loading-world">ЗАГРУЗКА МИРА...</p>
        </div>
      </Layout>
    );
  }

  const currentRegion = regions?.find(r => r.id === character?.regionId);
  const connectedIds = currentRegion?.connectedRegions || [];

  const handleTravel = (regionId: string) => {
    if (!character) return;
    travel.mutate({ characterId: character.id, targetRegionId: regionId });
    setSelectedRegion(null);
  };

  const regionEntities = selectedRegion
    ? (allEntities || []).filter(e => e.regionId === selectedRegion.id)
    : [];

  const isNight = worldState ? (worldState.timeOfDay < 5 || worldState.timeOfDay >= 21) : false;
  const WeatherIcon = worldState ? (WEATHER_ICONS[worldState.weather?.type || "clear"] || Sun) : Sun;

  return (
    <Layout>
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white mb-1" data-testid="text-world-title">Карта Мира</h1>
          {currentRegion && (
            <p className="text-muted-foreground font-tech flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Вы находитесь: <span className="text-primary font-bold">{currentRegion.nameRu}</span>
            </p>
          )}
        </div>

        {worldState && (
          <div className="flex items-center gap-4 glass-panel px-4 py-2 rounded-xl">
            <div className="flex items-center gap-2 text-sm">
              {isNight ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-yellow-400" />}
              <span className="text-white font-mono" data-testid="text-world-time">{formatTime(worldState.timeOfDay)}</span>
              <span className="text-muted-foreground text-xs">{getTimeLabel(worldState.timeOfDay)}</span>
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="flex items-center gap-2 text-sm">
              <WeatherIcon className="w-4 h-4 text-blue-400" />
              <span className="text-muted-foreground text-xs">{WEATHER_TYPE_RU[worldState.weather?.type || "clear"] || "Облачно"}</span>
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="flex items-center gap-2 text-sm">
              <Thermometer className="w-4 h-4 text-red-400" />
              <span className="text-white font-mono" data-testid="text-temperature">{Math.round(worldState.weather?.temperature || 0)}°</span>
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="text-xs text-muted-foreground">
              День {worldState.dayNumber} | {SEASON_RU[worldState.season] || worldState.season}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <div className="relative glass-panel rounded-2xl overflow-hidden" style={{ height: "500px" }} data-testid="map-container">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 900 800"
              className={`transition-all duration-1000 ${isNight ? "opacity-90" : ""}`}
            >
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="nightOverlay" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="100%" stopColor={isNight ? "rgba(0,0,10,0.6)" : "transparent"} />
                </radialGradient>
              </defs>

              {regions?.map(region => {
                const isConnected = connectedIds.includes(region.id);
                const isCurrent = character?.regionId === region.id;

                if (isCurrent && currentRegion) {
                  return connectedIds.map(connId => {
                    const connRegion = regions.find(r => r.id === connId);
                    if (!connRegion) return null;
                    return (
                      <line
                        key={`path-${region.id}-${connId}`}
                        x1={region.mapX + viewOffset.x + region.width / 2}
                        y1={region.mapY + viewOffset.y + region.height / 2}
                        x2={connRegion.mapX + viewOffset.x + connRegion.width / 2}
                        y2={connRegion.mapY + viewOffset.y + connRegion.height / 2}
                        stroke="rgba(16,185,129,0.3)"
                        strokeWidth="2"
                        strokeDasharray="8,4"
                      />
                    );
                  });
                }
                return null;
              })}

              {regions?.map(region => {
                const isConnected = connectedIds.includes(region.id);
                const isCurrent = character?.regionId === region.id;
                const isSelected = selectedRegion?.id === region.id;
                const x = region.mapX + viewOffset.x;
                const y = region.mapY + viewOffset.y;
                const entityCount = (allEntities || []).filter(e => e.regionId === region.id).length;

                return (
                  <g key={region.id} onClick={() => setSelectedRegion(region)} className="cursor-pointer" data-testid={`map-region-${region.id}`}>
                    <rect
                      x={x}
                      y={y}
                      width={region.width}
                      height={region.height}
                      rx={12}
                      fill={region.color}
                      opacity={isCurrent ? 0.8 : isConnected ? 0.5 : 0.25}
                      stroke={isCurrent ? "#10b981" : isSelected ? "#f59e0b" : isConnected ? "#10b981" : "#ffffff"}
                      strokeWidth={isCurrent ? 3 : isSelected ? 2 : 1}
                      strokeOpacity={isCurrent ? 1 : isConnected ? 0.5 : 0.15}
                      filter={isCurrent ? "url(#glow)" : undefined}
                    />
                    <text
                      x={x + region.width / 2}
                      y={y + region.height / 2 - 8}
                      textAnchor="middle"
                      fill="white"
                      fontSize="13"
                      fontWeight="bold"
                      className="font-serif pointer-events-none select-none"
                    >
                      {region.nameRu}
                    </text>
                    <text
                      x={x + region.width / 2}
                      y={y + region.height / 2 + 12}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.5)"
                      fontSize="10"
                      className="font-mono pointer-events-none select-none"
                    >
                      {ENERGY_TYPE_RU[region.energyType] || region.energyType} | {entityCount} сущ.
                    </text>

                    {isCurrent && (
                      <circle
                        cx={x + region.width / 2}
                        cy={y + region.height / 2 + 28}
                        r={5}
                        fill="#10b981"
                        className="animate-pulse"
                      />
                    )}

                    {isConnected && !isCurrent && (
                      <text
                        x={x + region.width / 2}
                        y={y + region.height / 2 + 30}
                        textAnchor="middle"
                        fill="#10b981"
                        fontSize="9"
                        className="pointer-events-none select-none"
                      >
                        Доступно
                      </text>
                    )}
                  </g>
                );
              })}

              <rect x="0" y="0" width="900" height="800" fill="url(#nightOverlay)" pointerEvents="none" />
            </svg>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <AnimatePresence mode="wait">
            {selectedRegion ? (
              <motion.div
                key={selectedRegion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="border-white/10 bg-black/60">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-serif font-bold text-white" data-testid="text-region-name">{selectedRegion.nameRu}</h3>
                      <Button size="icon" variant="ghost" onClick={() => setSelectedRegion(null)} data-testid="button-close-region">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4 font-tech">{selectedRegion.descriptionRu}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline" className="text-xs">
                        {ENERGY_TYPE_RU[selectedRegion.energyType] || selectedRegion.energyType}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Опасность: {selectedRegion.hazardLevel}/5
                      </Badge>
                    </div>

                    {regionEntities.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Существа в регионе</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {regionEntities.map(entity => (
                            <div key={entity.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg text-sm" data-testid={`entity-${entity.id}`}>
                              <div className="flex items-center gap-2">
                                {entity.type === "creature" ? <Skull className="w-3 h-3 text-red-400" /> :
                                 entity.type === "object" ? <Heart className="w-3 h-3 text-green-400" /> :
                                 <Zap className="w-3 h-3 text-yellow-400" />}
                                <span className="text-white/80">{entity.name}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{entity.health} HP</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {character?.regionId === selectedRegion.id ? (
                      <div className="text-center py-2">
                        <Badge className="bg-primary/20 text-primary border-primary/30">Вы здесь</Badge>
                      </div>
                    ) : connectedIds.includes(selectedRegion.id) ? (
                      <Button
                        onClick={() => handleTravel(selectedRegion.id)}
                        disabled={travel.isPending}
                        className="w-full bg-primary hover:bg-primary/90"
                        data-testid="button-travel"
                      >
                        {travel.isPending ? (
                          <span className="flex items-center gap-2"><Loader2 className="animate-spin w-4 h-4" /> Перемещение...</span>
                        ) : (
                          <span className="flex items-center gap-2"><Footprints className="w-4 h-4" /> Переместиться</span>
                        )}
                      </Button>
                    ) : (
                      <div className="text-center py-2">
                        <p className="text-xs text-muted-foreground">Этот регион недоступен из текущего местоположения</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Card className="border-white/10 bg-black/60">
                  <CardContent className="p-5 text-center">
                    <Compass className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground font-tech text-sm">Выберите регион на карте для получения информации</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {currentRegion && (
            <Card className="border-white/10 bg-black/60">
              <CardContent className="p-5">
                <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-3 font-display">Доступные Пути</h3>
                <div className="space-y-2">
                  {connectedIds.map(id => {
                    const r = regions?.find(reg => reg.id === id);
                    if (!r) return null;
                    return (
                      <button
                        key={id}
                        onClick={() => setSelectedRegion(r)}
                        className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-left"
                        data-testid={`path-${id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                          <span className="text-white/80 text-sm font-tech">{r.nameRu}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {r.hazardLevel}/5
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
