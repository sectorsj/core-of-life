import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/Layout";
import { useRegions, useWorldState, useEntities, useTravel } from "@/hooks/use-world";
import { useCharacter } from "@/hooks/use-characters";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Compass, Sun, Moon, Cloud, CloudRain, CloudLightning, Thermometer, Footprints, X, Skull, Heart, Zap, ZoomIn, ZoomOut, Locate } from "lucide-react";
import type { Region, Entity } from "@shared/schema";

const WEATHER_ICONS: Record<string, typeof Sun> = {
  clear: Sun,
  rain: CloudRain,
  storm: CloudLightning,
  cloudy: Cloud,
};

const WEATHER_TYPE_RU: Record<string, string> = {
  clear: "Ясно",
  rain: "Дождь",
  storm: "Шторм",
  cloudy: "Облачно",
  fog: "Туман",
  snow: "Снег",
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

const REGION_POLYGONS: Record<string, { points: number[][]; center: number[] }> = {
  forest_ancient: {
    points: [[420,340],[480,310],[540,330],[560,380],[540,440],[490,460],[430,450],[400,410],[390,370]],
    center: [470, 385],
  },
  volcano_dormant: {
    points: [[600,180],[660,150],[720,160],[750,210],[740,270],[700,300],[640,290],[590,250],[580,210]],
    center: [668, 225],
  },
  crystal_cave: {
    points: [[200,330],[260,300],[310,320],[330,370],[320,420],[280,450],[230,440],[190,400],[180,360]],
    center: [260, 375],
  },
  sky_sanctuary: {
    points: [[700,50],[750,30],[810,40],[840,80],[830,130],[790,160],[740,150],[700,120],[680,80]],
    center: [760, 93],
  },
  swamp_mist: {
    points: [[280,170],[340,140],[400,155],[430,200],[420,260],[380,290],[320,285],[270,250],[260,210]],
    center: [345, 218],
  },
  desert_crimson: {
    points: [[780,250],[850,220],[920,240],[960,290],[950,360],[910,400],[840,390],[790,350],[770,300]],
    center: [870, 310],
  },
  abyss_deep: {
    points: [[80,260],[140,230],[190,250],[210,300],[200,360],[170,400],[120,410],[70,380],[50,330],[60,290]],
    center: [130, 320],
  },
};

const ENTITY_ICONS: Record<string, { symbol: string; color: string }> = {
  creature: { symbol: "M", color: "#ef4444" },
  object: { symbol: "O", color: "#22c55e" },
  hazard: { symbol: "!", color: "#f59e0b" },
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.15;

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

function polygonCenter(points: number[][]): number[] {
  let cx = 0, cy = 0;
  for (const [x, y] of points) { cx += x; cy += y; }
  return [cx / points.length, cy / points.length];
}

function pointsToString(points: number[][]): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function distributeEntitiesInRegion(center: number[], count: number, index: number): { x: number; y: number } {
  const angleStep = (2 * Math.PI) / Math.max(count, 1);
  const angle = angleStep * index;
  const radius = 30 + (index % 2) * 15;
  return {
    x: center[0] + Math.cos(angle) * radius,
    y: center[1] + Math.sin(angle) * radius,
  };
}

export default function WorldMap() {
  const { data: regions, isLoading: regionsLoading } = useRegions();
  const { data: worldState } = useWorldState();
  const { data: character } = useCharacter();
  const { data: allEntities } = useEntities();
  const travel = useTravel();

  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(z => Math.min(Math.max(z + delta, MIN_ZOOM), MAX_ZOOM));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

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

  const viewBox = `0 0 1050 520`;

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
          <div className="flex items-center gap-4 flex-wrap glass-panel px-4 py-2 rounded-xl">
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
          <div
            ref={svgContainerRef}
            className="relative glass-panel rounded-2xl overflow-hidden select-none"
            style={{ height: "550px", cursor: isDragging ? "grabbing" : "grab" }}
            data-testid="map-container"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <svg
              width="100%"
              height="100%"
              viewBox={viewBox}
              className={`transition-opacity duration-1000 ${isNight ? "opacity-85" : ""}`}
              style={{ overflow: "visible" }}
            >
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="entityGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="nightOverlay" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="100%" stopColor={isNight ? "rgba(0,0,10,0.5)" : "transparent"} />
                </radialGradient>
                {regions?.map(region => {
                  const poly = REGION_POLYGONS[region.id];
                  if (!poly) return null;
                  const c = poly.center;
                  return (
                    <radialGradient key={`grad-${region.id}`} id={`regionGrad-${region.id}`} cx="50%" cy="50%" r="60%">
                      <stop offset="0%" stopColor={region.color} stopOpacity="0.9" />
                      <stop offset="100%" stopColor={region.color} stopOpacity="0.4" />
                    </radialGradient>
                  );
                })}
              </defs>

              <g transform={`translate(${pan.x / zoom}, ${pan.y / zoom}) scale(${zoom})`} style={{ transformOrigin: "525px 260px" }}>

                {regions?.map(region => {
                  const poly = REGION_POLYGONS[region.id];
                  if (!poly) return null;
                  const isCurrent = character?.regionId === region.id;

                  if (isCurrent && currentRegion) {
                    return connectedIds.map(connId => {
                      const connPoly = REGION_POLYGONS[connId];
                      if (!connPoly) return null;
                      return (
                        <line
                          key={`path-${region.id}-${connId}`}
                          x1={poly.center[0]}
                          y1={poly.center[1]}
                          x2={connPoly.center[0]}
                          y2={connPoly.center[1]}
                          stroke="rgba(16,185,129,0.25)"
                          strokeWidth="1.5"
                          strokeDasharray="6,4"
                        />
                      );
                    });
                  }
                  return null;
                })}

                {regions?.map(region => {
                  const poly = REGION_POLYGONS[region.id];
                  if (!poly) return null;

                  const isConnected = connectedIds.includes(region.id);
                  const isCurrent = character?.regionId === region.id;
                  const isSelected = selectedRegion?.id === region.id;
                  const entitiesInRegion = (allEntities || []).filter(e => e.regionId === region.id);
                  const entityCount = entitiesInRegion.length;

                  return (
                    <g key={region.id} onClick={() => setSelectedRegion(region)} className="cursor-pointer" data-testid={`map-region-${region.id}`}>
                      <polygon
                        points={pointsToString(poly.points)}
                        fill={`url(#regionGrad-${region.id})`}
                        opacity={isCurrent ? 0.9 : isConnected ? 0.65 : 0.3}
                        stroke={isCurrent ? "#10b981" : isSelected ? "#f59e0b" : isConnected ? "#10b981" : "#ffffff"}
                        strokeWidth={isCurrent ? 2.5 : isSelected ? 2 : 0.8}
                        strokeOpacity={isCurrent ? 1 : isConnected ? 0.6 : 0.2}
                        filter={isCurrent ? "url(#glow)" : undefined}
                        strokeLinejoin="round"
                      />

                      <text
                        x={poly.center[0]}
                        y={poly.center[1] - 12}
                        textAnchor="middle"
                        fill="white"
                        fontSize="11"
                        fontWeight="bold"
                        className="font-serif pointer-events-none select-none"
                        style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
                      >
                        {region.nameRu}
                      </text>
                      <text
                        x={poly.center[0]}
                        y={poly.center[1] + 4}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.5)"
                        fontSize="8"
                        className="font-mono pointer-events-none select-none"
                      >
                        {ENERGY_TYPE_RU[region.energyType] || region.energyType} | {entityCount} сущ.
                      </text>

                      {isCurrent && (
                        <circle
                          cx={poly.center[0]}
                          cy={poly.center[1] + 18}
                          r={4}
                          fill="#10b981"
                          className="animate-pulse"
                        />
                      )}

                      {isConnected && !isCurrent && (
                        <text
                          x={poly.center[0]}
                          y={poly.center[1] + 18}
                          textAnchor="middle"
                          fill="#10b981"
                          fontSize="8"
                          className="pointer-events-none select-none"
                        >
                          Доступно
                        </text>
                      )}

                      {entitiesInRegion.map((entity, idx) => {
                        const pos = distributeEntitiesInRegion(poly.center, entityCount, idx);
                        const iconData = ENTITY_ICONS[entity.type] || ENTITY_ICONS.creature;
                        return (
                          <g key={entity.id} filter="url(#entityGlow)">
                            <circle
                              cx={pos.x}
                              cy={pos.y}
                              r={6}
                              fill={`${iconData.color}33`}
                              stroke={iconData.color}
                              strokeWidth="1"
                            />
                            <text
                              x={pos.x}
                              y={pos.y + 3.5}
                              textAnchor="middle"
                              fill={iconData.color}
                              fontSize="8"
                              fontWeight="bold"
                              className="pointer-events-none select-none"
                            >
                              {iconData.symbol}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

                <rect x="0" y="0" width="1050" height="520" fill="url(#nightOverlay)" pointerEvents="none" />
              </g>
            </svg>

            <div className="absolute bottom-3 right-3 flex flex-col gap-1">
              <Button size="icon" variant="ghost" onClick={handleZoomIn} className="bg-black/50 text-white/80" data-testid="button-zoom-in">
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={handleZoomOut} className="bg-black/50 text-white/80" data-testid="button-zoom-out">
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={handleResetView} className="bg-black/50 text-white/80" data-testid="button-reset-view">
                <Locate className="w-4 h-4" />
              </Button>
            </div>

            <div className="absolute bottom-3 left-3 text-xs text-white/40 font-mono" data-testid="text-zoom-level">
              {Math.round(zoom * 100)}%
            </div>

            <div className="absolute top-3 right-3 flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                <span className="text-white/60">{ENTITY_TYPE_RU.creature}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                <span className="text-white/60">{ENTITY_TYPE_RU.object}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded">
                <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                <span className="text-white/60">{ENTITY_TYPE_RU.hazard}</span>
              </div>
            </div>
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
                        className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg hover-elevate transition-colors text-left"
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
