import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/Layout";
import { useRegions, useWorldState, useEntities, useTravel } from "@/hooks/use-world";
import { useCharacter } from "@/hooks/use-characters";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
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

type RegionStructure = {
  buildings: Array<{ x: number; y: number; w: number; h: number; label: string; type: "settlement" | "temple" | "tower" | "ruin" | "cave" | "well" }>;
  paths: Array<{ points: number[][] }>;
  landmarks: Array<{ x: number; y: number; label: string; shape: "tree" | "rock" | "water" | "crystal" | "flame" | "portal" | "skull" }>;
};

const REGION_DETAILS: Record<string, RegionStructure> = {
  forest_ancient: {
    buildings: [
      { x: 440, y: 360, w: 18, h: 14, label: "Хижина друида", type: "settlement" },
      { x: 500, y: 400, w: 14, h: 12, label: "Алтарь леса", type: "temple" },
      { x: 470, y: 430, w: 12, h: 10, label: "Наблюдательная", type: "tower" },
    ],
    paths: [
      { points: [[440,374],[470,390],[500,406]] },
      { points: [[470,390],[470,430]] },
    ],
    landmarks: [
      { x: 420, y: 340, label: "Великий дуб", shape: "tree" },
      { x: 530, y: 350, label: "Мшистые камни", shape: "rock" },
      { x: 490, y: 445, label: "Ручей жизни", shape: "water" },
      { x: 450, y: 395, label: "Грибная поляна", shape: "tree" },
    ],
  },
  volcano_dormant: {
    buildings: [
      { x: 650, y: 210, w: 16, h: 14, label: "Кузница огня", type: "settlement" },
      { x: 700, y: 250, w: 14, h: 12, label: "Храм пламени", type: "temple" },
      { x: 620, y: 240, w: 12, h: 10, label: "Руины стражей", type: "ruin" },
    ],
    paths: [
      { points: [[632,245],[650,224],[670,220],[700,256]] },
    ],
    landmarks: [
      { x: 680, y: 180, label: "Кратер", shape: "flame" },
      { x: 730, y: 230, label: "Лавовое озеро", shape: "flame" },
      { x: 610, y: 270, label: "Обсидиановый пик", shape: "rock" },
    ],
  },
  crystal_cave: {
    buildings: [
      { x: 245, y: 360, w: 16, h: 12, label: "Грот знаний", type: "cave" },
      { x: 280, y: 400, w: 14, h: 12, label: "Резонансный зал", type: "temple" },
      { x: 220, y: 390, w: 12, h: 10, label: "Покинутый лагерь", type: "ruin" },
    ],
    paths: [
      { points: [[245,372],[260,385],[280,406]] },
      { points: [[232,395],[260,385]] },
    ],
    landmarks: [
      { x: 300, y: 340, label: "Кристальный шпиль", shape: "crystal" },
      { x: 210, y: 420, label: "Аметистовая жила", shape: "crystal" },
      { x: 270, y: 350, label: "Эхо-колодец", shape: "water" },
    ],
  },
  sky_sanctuary: {
    buildings: [
      { x: 750, y: 80, w: 16, h: 12, label: "Парящий храм", type: "temple" },
      { x: 790, y: 110, w: 14, h: 10, label: "Башня ветров", type: "tower" },
      { x: 720, y: 100, w: 12, h: 10, label: "Причал облаков", type: "settlement" },
    ],
    paths: [
      { points: [[732,105],[750,92],[770,90],[790,115]] },
    ],
    landmarks: [
      { x: 760, y: 50, label: "Врата неба", shape: "portal" },
      { x: 810, y: 80, label: "Облачный мост", shape: "water" },
      { x: 730, y: 130, label: "Сад ветров", shape: "tree" },
    ],
  },
  swamp_mist: {
    buildings: [
      { x: 340, y: 200, w: 16, h: 12, label: "Хижина ведьмы", type: "settlement" },
      { x: 370, y: 250, w: 14, h: 12, label: "Жертвенник", type: "temple" },
      { x: 300, y: 230, w: 12, h: 10, label: "Затонувшие руины", type: "ruin" },
    ],
    paths: [
      { points: [[340,212],[350,230],[370,256]] },
      { points: [[312,235],[350,230]] },
    ],
    landmarks: [
      { x: 400, y: 180, label: "Гнилая топь", shape: "water" },
      { x: 290, y: 260, label: "Костяная роща", shape: "skull" },
      { x: 360, y: 170, label: "Блуждающий огонь", shape: "flame" },
    ],
  },
  desert_crimson: {
    buildings: [
      { x: 860, y: 290, w: 18, h: 14, label: "Город песков", type: "settlement" },
      { x: 900, y: 340, w: 14, h: 12, label: "Обелиск солнца", type: "temple" },
      { x: 820, y: 330, w: 12, h: 10, label: "Оазис", type: "well" },
    ],
    paths: [
      { points: [[860,304],[870,320],[900,346]] },
      { points: [[832,335],[870,320]] },
    ],
    landmarks: [
      { x: 920, y: 270, label: "Красные дюны", shape: "rock" },
      { x: 800, y: 280, label: "Мираж", shape: "portal" },
      { x: 880, y: 370, label: "Песчаная буря", shape: "flame" },
    ],
  },
  abyss_deep: {
    buildings: [
      { x: 125, y: 305, w: 16, h: 12, label: "Врата бездны", type: "cave" },
      { x: 155, y: 350, w: 14, h: 12, label: "Алтарь тьмы", type: "temple" },
      { x: 100, y: 340, w: 12, h: 10, label: "Шёпот теней", type: "ruin" },
    ],
    paths: [
      { points: [[125,317],[135,335],[155,356]] },
      { points: [[112,345],[135,335]] },
    ],
    landmarks: [
      { x: 170, y: 280, label: "Разлом", shape: "portal" },
      { x: 80, y: 370, label: "Тёмные воды", shape: "water" },
      { x: 150, y: 390, label: "Кости древних", shape: "skull" },
    ],
  },
};

const REGION_ICONS: Record<string, string> = {
  forest_ancient: "M 0,-8 L 3,-2 L 8,-2 L 4,2 L 5,8 L 0,5 L -5,8 L -4,2 L -8,-2 L -3,-2 Z",
  volcano_dormant: "M 0,-9 L 6,7 L -6,7 Z",
  crystal_cave: "M 0,-8 L 5,-3 L 5,4 L 0,8 L -5,4 L -5,-3 Z",
  sky_sanctuary: "M 0,-8 C 6,-6 8,0 4,5 L 0,8 L -4,5 C -8,0 -6,-6 0,-8 Z",
  swamp_mist: "M -6,-5 L 6,-5 L 8,0 L 6,5 L -6,5 L -8,0 Z",
  desert_crimson: "M -7,-4 L 7,-4 L 9,0 L 7,4 L -7,4 L -9,0 Z",
  abyss_deep: "M 0,-9 L 3,-3 L 9,-3 L 4,1 L 6,8 L 0,4 L -6,8 L -4,1 L -9,-3 L -3,-3 Z",
};

const BIOME_ICON_COLOR: Record<string, string> = {
  forest: "#4ade80",
  volcanic: "#f87171",
  underground: "#a78bfa",
  aerial: "#67e8f9",
  swamp: "#a3e635",
  desert: "#fbbf24",
  abyss: "#818cf8",
};

const LOD_FAR = 0.75;
const LOD_CLOSE = 1.5;

const ENTITY_MARKER_COLORS: Record<string, string> = {
  creature: "#ef4444",
  object: "#22c55e",
  hazard: "#f59e0b",
};

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3.0;
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

function pointsToString(points: number[][]): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function pathToD(points: number[][]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
}

function distributeEntitiesInRegion(center: number[], count: number, index: number): { x: number; y: number } {
  const angleStep = (2 * Math.PI) / Math.max(count, 1);
  const angle = angleStep * index - Math.PI / 2;
  const radius = 28 + (index % 2) * 14;
  return {
    x: center[0] + Math.cos(angle) * radius,
    y: center[1] + Math.sin(angle) * radius,
  };
}

function renderLandmarkShape(shape: string, x: number, y: number, color: string): JSX.Element {
  switch (shape) {
    case "tree":
      return (
        <g>
          <line x1={x} y1={y + 4} x2={x} y2={y + 7} stroke="#8B6914" strokeWidth="1.5" />
          <circle cx={x} cy={y + 1} r={4} fill="#2d6a1e" opacity={0.7} />
          <circle cx={x - 2} cy={y} r={3} fill="#3a8c2a" opacity={0.6} />
          <circle cx={x + 2} cy={y - 1} r={3} fill="#4aa83a" opacity={0.5} />
        </g>
      );
    case "rock":
      return (
        <polygon points={`${x-4},${y+4} ${x-2},${y-3} ${x+1},${y-4} ${x+4},${y-1} ${x+3},${y+4}`} fill="#6b7280" opacity={0.6} stroke="#9ca3af" strokeWidth="0.5" />
      );
    case "water":
      return (
        <g opacity={0.6}>
          <ellipse cx={x} cy={y} rx={6} ry={3} fill="#3b82f6" opacity={0.4} />
          <path d={`M ${x-5} ${y} Q ${x-2} ${y-2} ${x} ${y} Q ${x+2} ${y+2} ${x+5} ${y}`} fill="none" stroke="#60a5fa" strokeWidth="1" />
        </g>
      );
    case "crystal":
      return (
        <g opacity={0.7}>
          <polygon points={`${x},${y-5} ${x+3},${y+2} ${x},${y+5} ${x-3},${y+2}`} fill="#a78bfa" opacity={0.5} stroke="#c4b5fd" strokeWidth="0.5" />
          <line x1={x} y1={y-5} x2={x+1} y2={y} stroke="#ddd6fe" strokeWidth="0.5" opacity={0.8} />
        </g>
      );
    case "flame":
      return (
        <g opacity={0.7}>
          <ellipse cx={x} cy={y+2} rx={3} ry={1.5} fill="#fbbf24" opacity={0.3} />
          <path d={`M ${x} ${y+3} Q ${x-2} ${y} ${x} ${y-5} Q ${x+2} ${y} ${x} ${y+3}`} fill="#f97316" opacity={0.6} />
          <path d={`M ${x} ${y+2} Q ${x-1} ${y} ${x} ${y-3} Q ${x+1} ${y} ${x} ${y+2}`} fill="#fbbf24" opacity={0.7} />
        </g>
      );
    case "portal":
      return (
        <g opacity={0.6}>
          <ellipse cx={x} cy={y} rx={4} ry={5} fill="none" stroke="#a78bfa" strokeWidth="1" strokeDasharray="2,1" />
          <ellipse cx={x} cy={y} rx={2} ry={3} fill="#7c3aed" opacity={0.3} />
        </g>
      );
    case "skull":
      return (
        <g opacity={0.6}>
          <circle cx={x} cy={y-1} r={4} fill="#d1d5db" opacity={0.5} stroke="#9ca3af" strokeWidth="0.5" />
          <circle cx={x-1.5} cy={y-2} r={1} fill="#1f2937" />
          <circle cx={x+1.5} cy={y-2} r={1} fill="#1f2937" />
          <path d={`M ${x-1.5} ${y+1} L ${x+1.5} ${y+1}`} stroke="#1f2937" strokeWidth="0.5" />
        </g>
      );
    default:
      return <circle cx={x} cy={y} r={3} fill={color} opacity={0.5} />;
  }
}

function renderBuildingShape(type: string, x: number, y: number, w: number, h: number): JSX.Element {
  switch (type) {
    case "settlement":
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} fill="#78716c" opacity={0.5} stroke="#a8a29e" strokeWidth="0.5" rx={1} />
          <polygon points={`${x},${y} ${x + w/2},${y - 5} ${x + w},${y}`} fill="#a8a29e" opacity={0.5} />
          <rect x={x + w/2 - 2} y={y + h - 5} width={4} height={5} fill="#57534e" opacity={0.6} />
        </g>
      );
    case "temple":
      return (
        <g>
          <rect x={x + 1} y={y + 3} width={w - 2} height={h - 3} fill="#78716c" opacity={0.5} stroke="#a8a29e" strokeWidth="0.5" />
          <polygon points={`${x - 1},${y + 3} ${x + w/2},${y - 4} ${x + w + 1},${y + 3}`} fill="#d4af37" opacity={0.4} stroke="#fbbf24" strokeWidth="0.5" />
          <line x1={x + w/2} y1={y - 4} x2={x + w/2} y2={y - 7} stroke="#fbbf24" strokeWidth="0.8" />
        </g>
      );
    case "tower":
      return (
        <g>
          <rect x={x + w/2 - 3} y={y} width={6} height={h + 3} fill="#78716c" opacity={0.5} stroke="#a8a29e" strokeWidth="0.5" />
          <polygon points={`${x + w/2 - 4},${y} ${x + w/2},${y - 5} ${x + w/2 + 4},${y}`} fill="#a8a29e" opacity={0.5} />
          <rect x={x + w/2 - 1} y={y + 2} width={2} height={2} fill="#fbbf24" opacity={0.5} />
        </g>
      );
    case "ruin":
      return (
        <g opacity={0.4}>
          <rect x={x} y={y + 2} width={w} height={h - 2} fill="#57534e" stroke="#78716c" strokeWidth="0.5" rx={0} strokeDasharray="2,1" />
          <line x1={x + 2} y1={y} x2={x + 2} y2={y + h} stroke="#78716c" strokeWidth="1" />
          <line x1={x + w - 2} y1={y + 1} x2={x + w - 2} y2={y + h} stroke="#78716c" strokeWidth="1" />
        </g>
      );
    case "cave":
      return (
        <g>
          <ellipse cx={x + w/2} cy={y + h/2} rx={w/2 + 2} ry={h/2 + 1} fill="#44403c" opacity={0.5} />
          <ellipse cx={x + w/2} cy={y + h/2 + 1} rx={w/3} ry={h/3} fill="#1c1917" opacity={0.6} />
        </g>
      );
    case "well":
      return (
        <g>
          <circle cx={x + w/2} cy={y + h/2} r={w/2} fill="none" stroke="#a8a29e" strokeWidth="1" opacity={0.5} />
          <circle cx={x + w/2} cy={y + h/2} r={w/3} fill="#3b82f6" opacity={0.3} />
        </g>
      );
    default:
      return <rect x={x} y={y} width={w} height={h} fill="#78716c" opacity={0.4} rx={1} />;
  }
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

  const lod: "far" | "medium" | "close" = zoom < LOD_FAR ? "far" : zoom > LOD_CLOSE ? "close" : "medium";

  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const handleResetView = useCallback(() => {
    if (character?.regionId) {
      const poly = REGION_POLYGONS[character.regionId];
      if (poly && svgContainerRef.current) {
        const rect = svgContainerRef.current.getBoundingClientRect();
        const viewBoxW = 1050;
        const viewBoxH = 520;
        const scaleX = rect.width / viewBoxW;
        const scaleY = rect.height / viewBoxH;
        const scale = Math.min(scaleX, scaleY);
        const targetZoom = 1.2;
        const viewCenterX = (rect.width / 2) / scale;
        const viewCenterY = (rect.height / 2) / scale;
        const offsetX = (viewCenterX - poly.center[0]) * targetZoom;
        const offsetY = (viewCenterY - poly.center[1]) * targetZoom;
        setZoom(targetZoom);
        setPan({ x: offsetX, y: offsetY });
        return;
      }
    }
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [character?.regionId]);

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

  const lodLabel = lod === "far" ? "Обзор" : lod === "close" ? "Детали" : "Карта";

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
                <filter id="softGlow">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="nightOverlay" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="100%" stopColor={isNight ? "rgba(0,0,10,0.5)" : "transparent"} />
                </radialGradient>

                <radialGradient id="oceanGrad" cx="50%" cy="40%" r="65%">
                  <stop offset="0%" stopColor="#0a2a3a" />
                  <stop offset="60%" stopColor="#061820" />
                  <stop offset="100%" stopColor="#030d14" />
                </radialGradient>
                <linearGradient id="landGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1a2e1a" />
                  <stop offset="50%" stopColor="#1f321c" />
                  <stop offset="100%" stopColor="#2a3020" />
                </linearGradient>
                <linearGradient id="sandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3a3020" />
                  <stop offset="100%" stopColor="#2e2818" />
                </linearGradient>
                <linearGradient id="mountainGrad" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="#3a3a44" />
                  <stop offset="100%" stopColor="#25252e" />
                </linearGradient>
                <linearGradient id="riverFlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0e4a6a" />
                  <stop offset="100%" stopColor="#0a3850" />
                </linearGradient>
                <radialGradient id="lakeGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#104060" />
                  <stop offset="100%" stopColor="#0a2a40" />
                </radialGradient>
                <filter id="terrainShadow">
                  <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#000000" floodOpacity="0.4" />
                </filter>
                {regions?.map(region => {
                  const poly = REGION_POLYGONS[region.id];
                  if (!poly) return null;
                  return (
                    <radialGradient key={`grad-${region.id}`} id={`regionGrad-${region.id}`} cx="50%" cy="50%" r="60%">
                      <stop offset="0%" stopColor={region.color} stopOpacity="0.9" />
                      <stop offset="100%" stopColor={region.color} stopOpacity="0.4" />
                    </radialGradient>
                  );
                })}
                {regions?.map(region => {
                  const poly = REGION_POLYGONS[region.id];
                  if (!poly) return null;
                  return (
                    <clipPath key={`clip-${region.id}`} id={`regionClip-${region.id}`}>
                      <polygon points={pointsToString(poly.points)} />
                    </clipPath>
                  );
                })}
              </defs>

              <g transform={`translate(${pan.x / zoom}, ${pan.y / zoom}) scale(${zoom})`} style={{ transformOrigin: "525px 260px" }}>

                {/* ====== TERRAIN BASE LAYER ====== */}
                <g className="pointer-events-none">
                <rect x="-50" y="-50" width="1150" height="620" fill="url(#oceanGrad)" />

                <g className="pointer-events-none" opacity="0.15">
                  <circle cx="200" cy="100" r="2" fill="#1a5a8a" opacity="0.5" />
                  <circle cx="950" cy="400" r="3" fill="#1a5a8a" opacity="0.4" />
                  <circle cx="100" cy="450" r="2" fill="#1a5a8a" opacity="0.3" />
                  <circle cx="500" cy="40" r="1.5" fill="#1a5a8a" opacity="0.5" />
                  <circle cx="850" cy="80" r="2" fill="#1a5a8a" opacity="0.4" />
                  <path d="M -20 480 Q 200 470, 400 485 Q 600 500, 800 475 Q 950 465, 1100 480" fill="none" stroke="#0a3050" strokeWidth="1" opacity="0.3" />
                  <path d="M -30 500 Q 250 490, 500 505 Q 750 515, 1050 495" fill="none" stroke="#0a3050" strokeWidth="0.8" opacity="0.2" />
                </g>

                <polygon
                  points="30,160 60,110 120,80 200,60 300,50 380,65 450,55 520,70 600,60 700,35 780,20 860,30 940,50 1000,90 1020,140 1010,200 1020,280 1010,350 990,420 960,460 900,480 820,490 740,485 650,495 560,500 470,495 380,490 290,485 200,490 130,480 70,450 40,400 25,340 20,280 25,220"
                  fill="url(#landGrad)"
                  filter="url(#terrainShadow)"
                  strokeLinejoin="round"
                />

                <polygon
                  points="760,170 800,145 860,140 920,160 970,200 990,260 985,330 960,390 920,430 870,450 820,440 790,400 770,340 755,280 750,220"
                  fill="url(#sandGrad)"
                  opacity="0.7"
                  strokeLinejoin="round"
                />

                <polygon
                  points="600,100 650,75 720,70 770,90 790,130 780,170 740,200 680,210 630,190 600,150"
                  fill="url(#mountainGrad)"
                  opacity="0.6"
                  strokeLinejoin="round"
                />

                <polygon
                  points="400,100 440,85 490,90 520,110 530,145 510,180 470,200 430,195 400,170 390,135"
                  fill="#152515"
                  opacity="0.5"
                  strokeLinejoin="round"
                />

                <polygon
                  points="50,200 90,175 140,170 190,185 210,230 200,280 170,310 130,330 80,320 45,280"
                  fill="#101825"
                  opacity="0.6"
                  strokeLinejoin="round"
                />

                <polygon
                  points="280,380 310,360 350,370 380,400 400,440 390,470 350,485 310,475 280,445 270,410"
                  fill="#0e200e"
                  opacity="0.4"
                  strokeLinejoin="round"
                />

                {/* Islands */}
                <polygon
                  points="10,100 30,80 60,85 70,105 55,120 25,118"
                  fill="url(#landGrad)"
                  filter="url(#terrainShadow)"
                  opacity="0.7"
                  strokeLinejoin="round"
                />
                <polygon
                  points="980,430 1000,415 1030,420 1040,445 1020,460 990,455"
                  fill="url(#landGrad)"
                  filter="url(#terrainShadow)"
                  opacity="0.7"
                  strokeLinejoin="round"
                />
                <polygon
                  points="920,500 945,490 970,495 975,510 955,520 930,515"
                  fill="url(#landGrad)"
                  filter="url(#terrainShadow)"
                  opacity="0.6"
                  strokeLinejoin="round"
                />

                {/* Rivers */}
                <path
                  d="M 530,110 Q 510,150, 490,200 Q 475,240, 460,280 Q 450,320, 455,360 Q 460,400, 470,440 Q 478,470, 485,495"
                  fill="none"
                  stroke="url(#riverFlow)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity="0.8"
                />
                <path
                  d="M 460,280 Q 400,290, 340,285 Q 290,280, 250,300 Q 210,320, 180,350"
                  fill="none"
                  stroke="url(#riverFlow)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.7"
                />
                <path
                  d="M 490,200 Q 550,210, 610,230 Q 660,245, 700,260 Q 740,275, 770,290"
                  fill="none"
                  stroke="url(#riverFlow)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.6"
                />

                {/* Lakes */}
                <ellipse
                  cx="350" cy="150"
                  rx="25" ry="15"
                  fill="url(#lakeGrad)"
                  opacity="0.8"
                />
                <ellipse
                  cx="150" cy="250"
                  rx="18" ry="12"
                  fill="url(#lakeGrad)"
                  opacity="0.7"
                />
                <ellipse
                  cx="680" cy="320"
                  rx="15" ry="10"
                  fill="url(#lakeGrad)"
                  opacity="0.6"
                />

                {/* Coastline detail */}
                <polygon
                  points="30,160 60,110 120,80 200,60 300,50 380,65 450,55 520,70 600,60 700,35 780,20 860,30 940,50 1000,90 1020,140 1010,200 1020,280 1010,350 990,420 960,460 900,480 820,490 740,485 650,495 560,500 470,495 380,490 290,485 200,490 130,480 70,450 40,400 25,340 20,280 25,220"
                  fill="none"
                  stroke="#1a5a6a"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  opacity="0.4"
                />

                {/* Mountain ridge markers */}
                <g className="pointer-events-none" opacity="0.3">
                  <polygon points="640,95 650,75 660,95" fill="#4a4a55" />
                  <polygon points="670,90 680,70 690,90" fill="#4a4a55" />
                  <polygon points="700,88 710,68 720,88" fill="#4a4a55" />
                  <polygon points="730,92 740,72 750,92" fill="#4a4a55" />
                </g>

                {/* Terrain texture dots */}
                <g className="pointer-events-none" opacity="0.1">
                  {Array.from({ length: 40 }, (_, i) => {
                    const tx = 80 + (i * 23) % 880;
                    const ty = 80 + (i * 37) % 380;
                    return <circle key={`td-${i}`} cx={tx} cy={ty} r={1} fill="#4a6a4a" />;
                  })}
                </g>

                {/* ====== END TERRAIN LAYER ====== */}
                </g>

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
                          strokeWidth={lod === "far" ? "1" : "1.5"}
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
                  const details = REGION_DETAILS[region.id];
                  const biomeColor = BIOME_ICON_COLOR[region.biome] || "#ffffff";

                  const regionTooltip = `${region.nameRu}${isCurrent ? " (вы здесь)" : isConnected ? " (доступно)" : ""} — ${ENERGY_TYPE_RU[region.energyType] || region.energyType}, опасность: ${region.hazardLevel}/5`;

                  return (
                    <g key={region.id} onClick={() => setSelectedRegion(region)} className="cursor-pointer" data-testid={`map-region-${region.id}`}>

                      <polygon
                        points={pointsToString(poly.points)}
                        fill={lod === "far" ? region.color : `url(#regionGrad-${region.id})`}
                        opacity={lod === "far"
                          ? (isCurrent ? 0.3 : 0.1)
                          : (isCurrent ? 0.9 : isConnected ? 0.65 : 0.3)
                        }
                        stroke={isCurrent ? "#10b981" : isSelected ? "#f59e0b" : isConnected ? "#10b981" : "#ffffff"}
                        strokeWidth={lod === "far" ? 0.5 : (isCurrent ? 2.5 : isSelected ? 2 : 0.8)}
                        strokeOpacity={isCurrent ? (lod === "far" ? 0.5 : 1) : isConnected ? 0.6 : (lod === "far" ? 0.1 : 0.2)}
                        filter={isCurrent && lod !== "far" ? "url(#glow)" : undefined}
                        strokeLinejoin="round"
                      >
                        <title>{regionTooltip}</title>
                      </polygon>

                      {lod === "far" && (
                        <g filter={isCurrent ? "url(#glow)" : "url(#softGlow)"}>
                          <circle
                            cx={poly.center[0]}
                            cy={poly.center[1]}
                            r={12}
                            fill={`${region.color}88`}
                            stroke={isCurrent ? "#10b981" : isSelected ? "#f59e0b" : biomeColor}
                            strokeWidth={isCurrent ? 2 : 1}
                          />
                          <path
                            d={REGION_ICONS[region.id] || "M -5,-5 L 5,-5 L 5,5 L -5,5 Z"}
                            transform={`translate(${poly.center[0]}, ${poly.center[1]}) scale(0.8)`}
                            fill={biomeColor}
                            opacity={0.9}
                          />
                          <text
                            x={poly.center[0]}
                            y={poly.center[1] + 22}
                            textAnchor="middle"
                            fill="white"
                            fontSize="9"
                            fontWeight="bold"
                            className="font-serif pointer-events-none select-none"
                            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
                          >
                            {region.nameRu}
                          </text>
                          {isCurrent && (
                            <circle
                              cx={poly.center[0]}
                              cy={poly.center[1] + 32}
                              r={3}
                              fill="#10b981"
                              className="animate-pulse"
                            />
                          )}
                        </g>
                      )}

                      {lod === "medium" && (
                        <>
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
                            const markerColor = ENTITY_MARKER_COLORS[entity.type] || "#ef4444";
                            return (
                              <g key={entity.id} filter="url(#entityGlow)">
                                <circle cx={pos.x} cy={pos.y} r={5} fill={`${markerColor}33`} stroke={markerColor} strokeWidth="1" />
                                <circle cx={pos.x} cy={pos.y} r={2} fill={markerColor} opacity={0.8} />
                              </g>
                            );
                          })}
                        </>
                      )}

                      {lod === "close" && details && (
                        <>
                          <g clipPath={`url(#regionClip-${region.id})`} className="pointer-events-none">
                            {details.paths.map((p, i) => (
                              <path
                                key={`dpath-${region.id}-${i}`}
                                d={pathToD(p.points)}
                                fill="none"
                                stroke="rgba(255,255,255,0.15)"
                                strokeWidth="1.5"
                                strokeDasharray="3,2"
                                strokeLinecap="round"
                              />
                            ))}

                            {details.landmarks.map((lm, i) => (
                              <g key={`lm-${region.id}-${i}`}>
                                {renderLandmarkShape(lm.shape, lm.x, lm.y, biomeColor)}
                                <text
                                  x={lm.x}
                                  y={lm.y + 14}
                                  textAnchor="middle"
                                  fill="rgba(255,255,255,0.5)"
                                  fontSize="5"
                                  className="pointer-events-none select-none font-mono"
                                >
                                  {lm.label}
                                </text>
                              </g>
                            ))}

                            {details.buildings.map((b, i) => (
                              <g key={`bld-${region.id}-${i}`}>
                                {renderBuildingShape(b.type, b.x, b.y, b.w, b.h)}
                                <text
                                  x={b.x + b.w / 2}
                                  y={b.y + b.h + 9}
                                  textAnchor="middle"
                                  fill="rgba(255,255,255,0.7)"
                                  fontSize="5.5"
                                  fontWeight="bold"
                                  className="pointer-events-none select-none font-mono"
                                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}
                                >
                                  {b.label}
                                </text>
                              </g>
                            ))}

                            {entitiesInRegion.map((entity, idx) => {
                              const pos = distributeEntitiesInRegion(poly.center, entityCount, idx);
                              const markerColor = ENTITY_MARKER_COLORS[entity.type] || "#ef4444";
                              return (
                                <g key={entity.id} filter="url(#entityGlow)">
                                  <circle cx={pos.x} cy={pos.y} r={6} fill={`${markerColor}22`} stroke={markerColor} strokeWidth="1" />
                                  <circle cx={pos.x} cy={pos.y} r={2.5} fill={markerColor} opacity={0.9} />
                                  <text
                                    x={pos.x}
                                    y={pos.y - 9}
                                    textAnchor="middle"
                                    fill="rgba(255,255,255,0.7)"
                                    fontSize="5"
                                    className="pointer-events-none select-none font-mono"
                                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}
                                  >
                                    {entity.name}
                                  </text>
                                </g>
                              );
                            })}
                          </g>

                          <text
                            x={poly.center[0]}
                            y={poly.center[1] - 30}
                            textAnchor="middle"
                            fill="white"
                            fontSize="10"
                            fontWeight="bold"
                            className="font-serif pointer-events-none select-none"
                            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
                          >
                            {region.nameRu}
                          </text>

                          {isCurrent && (
                            <circle
                              cx={poly.center[0]}
                              cy={poly.center[1] - 38}
                              r={3}
                              fill="#10b981"
                              className="animate-pulse"
                            />
                          )}
                        </>
                      )}
                    </g>
                  );
                })}

                <rect x="0" y="0" width="1050" height="520" fill="url(#nightOverlay)" pointerEvents="none" />
              </g>
            </svg>

            <div className="absolute bottom-3 right-3 flex flex-col gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={handleZoomIn} className="bg-black/50 text-white/80" data-testid="button-zoom-in">
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Приблизить</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={handleZoomOut} className="bg-black/50 text-white/80" data-testid="button-zoom-out">
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Отдалить</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={handleResetView} className="bg-black/50 text-white/80" data-testid="button-reset-view">
                    <Locate className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Центрировать на персонаже</TooltipContent>
              </Tooltip>
            </div>

            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <span className="text-xs text-white/40 font-mono" data-testid="text-zoom-level">
                {Math.round(zoom * 100)}%
              </span>
              <span className="text-xs text-white/30 font-mono">
                {lodLabel}
              </span>
            </div>

            <div className="absolute top-3 right-3 flex flex-col gap-1 text-xs">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded cursor-default" data-testid="legend-creature" tabIndex={0}>
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                    <span className="text-white/60">{ENTITY_TYPE_RU.creature}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">Живые существа в регионе</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded cursor-default" data-testid="legend-object" tabIndex={0}>
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                    <span className="text-white/60">{ENTITY_TYPE_RU.object}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">Интерактивные объекты</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded cursor-default" data-testid="legend-hazard" tabIndex={0}>
                    <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                    <span className="text-white/60">{ENTITY_TYPE_RU.hazard}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">Опасные зоны и ловушки</TooltipContent>
              </Tooltip>
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" onClick={() => setSelectedRegion(null)} data-testid="button-close-region">
                            <X className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">Закрыть</TooltipContent>
                      </Tooltip>
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
                            <Tooltip key={entity.id}>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg text-sm cursor-default" data-testid={`entity-${entity.id}`}>
                                  <div className="flex items-center gap-2">
                                    {entity.type === "creature" ? <Skull className="w-3 h-3 text-red-400" /> :
                                     entity.type === "object" ? <Heart className="w-3 h-3 text-green-400" /> :
                                     <Zap className="w-3 h-3 text-yellow-400" />}
                                    <span className="text-white/80">{entity.name}</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">{entity.health} HP</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                {ENTITY_TYPE_RU[entity.type] || entity.type} — {entity.state} | Масса: {entity.mass}
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    )}

                    {character?.regionId === selectedRegion.id ? (
                      <div className="text-center py-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span><Badge className="bg-primary/20 text-primary border-primary/30">Вы здесь</Badge></span>
                          </TooltipTrigger>
                          <TooltipContent>Ваш персонаж находится в этом регионе</TooltipContent>
                        </Tooltip>
                      </div>
                    ) : connectedIds.includes(selectedRegion.id) ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
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
                        </TooltipTrigger>
                        <TooltipContent>Переместить персонажа в этот регион</TooltipContent>
                      </Tooltip>
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
                      <Tooltip key={id}>
                        <TooltipTrigger asChild>
                          <button
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
                        </TooltipTrigger>
                        <TooltipContent side="left">{r.descriptionRu}</TooltipContent>
                      </Tooltip>
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
