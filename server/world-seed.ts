import { db } from "./db";
import { regions, entities } from "@shared/schema";

const SEED_REGIONS = [
  {
    id: "forest_ancient",
    name: "Ancient Forest",
    nameRu: "Древний Лес",
    biome: "forest",
    description: "A primordial forest teeming with life energy",
    descriptionRu: "Первозданный лес, наполненный жизненной энергией",
    mapX: 0,
    mapY: 0,
    width: 200,
    height: 200,
    color: "#228B22",
    connectedRegions: ["volcano_dormant", "crystal_cave", "swamp_mist"],
    hazardLevel: 1,
    energyType: "life",
  },
  {
    id: "volcano_dormant",
    name: "Dormant Volcano",
    nameRu: "Спящий Вулкан",
    biome: "volcanic",
    description: "A volcano radiating raw terrestrial heat",
    descriptionRu: "Вулкан, излучающий сырой жар земли",
    mapX: 250,
    mapY: -100,
    width: 180,
    height: 180,
    color: "#B22222",
    connectedRegions: ["forest_ancient", "sky_sanctuary", "desert_crimson"],
    hazardLevel: 3,
    energyType: "fire",
  },
  {
    id: "crystal_cave",
    name: "Crystal Caves",
    nameRu: "Хрустальные Пещеры",
    biome: "underground",
    description: "Caves resonating with crystalline frequencies",
    descriptionRu: "Пещеры, резонирующие кристаллическими частотами",
    mapX: -200,
    mapY: 150,
    width: 160,
    height: 160,
    color: "#6A5ACD",
    connectedRegions: ["forest_ancient", "abyss_deep", "swamp_mist"],
    hazardLevel: 2,
    energyType: "psychic",
  },
  {
    id: "sky_sanctuary",
    name: "Sky Sanctuary",
    nameRu: "Небесное Святилище",
    biome: "aerial",
    description: "A floating sanctuary of pure aether",
    descriptionRu: "Парящее святилище чистого эфира",
    mapX: 300,
    mapY: -300,
    width: 150,
    height: 150,
    color: "#00CED1",
    connectedRegions: ["volcano_dormant", "desert_crimson"],
    hazardLevel: 2,
    energyType: "aether",
  },
  {
    id: "swamp_mist",
    name: "Misty Swamp",
    nameRu: "Туманное Болото",
    biome: "swamp",
    description: "Toxic marshlands shrouded in eternal mist",
    descriptionRu: "Токсичные болота, окутанные вечным туманом",
    mapX: -100,
    mapY: -200,
    width: 190,
    height: 170,
    color: "#556B2F",
    connectedRegions: ["forest_ancient", "crystal_cave", "abyss_deep"],
    hazardLevel: 3,
    energyType: "death",
  },
  {
    id: "desert_crimson",
    name: "Crimson Desert",
    nameRu: "Багряная Пустыня",
    biome: "desert",
    description: "Endless red sands under a burning sky",
    descriptionRu: "Бескрайние красные пески под пылающим небом",
    mapX: 500,
    mapY: -200,
    width: 220,
    height: 200,
    color: "#CD853F",
    connectedRegions: ["volcano_dormant", "sky_sanctuary"],
    hazardLevel: 4,
    energyType: "solar",
  },
  {
    id: "abyss_deep",
    name: "Deep Abyss",
    nameRu: "Глубокая Бездна",
    biome: "abyss",
    description: "The bottomless void where reality thins",
    descriptionRu: "Бездонная пустота, где реальность истончается",
    mapX: -350,
    mapY: 0,
    width: 170,
    height: 200,
    color: "#191970",
    connectedRegions: ["crystal_cave", "swamp_mist"],
    hazardLevel: 5,
    energyType: "void",
  },
];

const SEED_ENTITIES = [
  { name: "Лесной Страж", type: "creature", regionId: "forest_ancient", posX: 50, posY: 50, mass: 5, health: 200, state: "patrol", properties: { aggression: 0.2, element: "life" } },
  { name: "Огненный Элементаль", type: "creature", regionId: "volcano_dormant", posX: 100, posY: -50, mass: 3, health: 150, state: "idle", properties: { aggression: 0.7, element: "fire" } },
  { name: "Кристальный Голем", type: "creature", regionId: "crystal_cave", posX: -150, posY: 180, mass: 10, health: 300, state: "guard", properties: { aggression: 0.4, element: "earth" } },
  { name: "Эфирный Дракон", type: "creature", regionId: "sky_sanctuary", posX: 320, posY: -280, mass: 8, health: 500, state: "flying", properties: { aggression: 0.3, element: "aether" } },
  { name: "Болотный Призрак", type: "creature", regionId: "swamp_mist", posX: -80, posY: -180, mass: 1, health: 80, state: "lurking", properties: { aggression: 0.6, element: "death" } },
  { name: "Песчаный Червь", type: "creature", regionId: "desert_crimson", posX: 520, posY: -180, mass: 20, health: 400, state: "burrowed", properties: { aggression: 0.8, element: "earth" } },
  { name: "Тень Бездны", type: "creature", regionId: "abyss_deep", posX: -330, posY: 20, mass: 0.5, health: 1000, state: "dormant", properties: { aggression: 0.9, element: "void" } },
  { name: "Целебный Источник", type: "object", regionId: "forest_ancient", posX: 80, posY: 120, mass: 100, health: 9999, state: "active", properties: { healAmount: 25, cooldown: 60 } },
  { name: "Лавовый Гейзер", type: "hazard", regionId: "volcano_dormant", posX: 280, posY: -80, mass: 100, health: 9999, state: "active", properties: { damage: 30, interval: 10 } },
];

export async function seedWorldData() {
  const existingRegions = await db.select().from(regions);
  if (existingRegions.length > 0) {
    console.log("[seed] World data already exists, skipping seed");
    return;
  }

  console.log("[seed] Seeding world regions...");
  for (const region of SEED_REGIONS) {
    await db.insert(regions).values(region);
  }
  console.log(`[seed] Created ${SEED_REGIONS.length} regions`);

  console.log("[seed] Seeding world entities...");
  for (const entity of SEED_ENTITIES) {
    await db.insert(entities).values(entity);
  }
  console.log(`[seed] Created ${SEED_ENTITIES.length} entities`);

  console.log("[seed] World data seeded successfully");
}
