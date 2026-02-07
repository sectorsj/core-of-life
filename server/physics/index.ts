import express from "express";
import { db } from "../db";
import { regions, worldState, entities, characters, worldEvents, type Region, type WorldState, type Entity } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const app = express();
app.use(express.json());

const TICK_INTERVAL_MS = 5000;
const TIME_SPEED = 0.01;

async function getOrCreateWorldState(): Promise<WorldState> {
  const [existing] = await db.select().from(worldState);
  if (existing) return existing;

  const [created] = await db.insert(worldState).values({
    timeOfDay: 12.0,
    dayNumber: 1,
    season: "spring",
    globalGravity: 9.81,
    weather: {
      type: "clear",
      intensity: 0,
      windDirection: 0,
      windSpeed: 2.5,
      temperature: 22,
    },
  }).returning();
  return created;
}

function computeWeather(state: WorldState): WorldState["weather"] {
  const weather = { ...state.weather } as WorldState["weather"];
  const hour = state.timeOfDay;

  if (hour > 6 && hour < 18) {
    weather.temperature = 18 + Math.sin((hour - 6) / 12 * Math.PI) * 12;
  } else {
    weather.temperature = 10 + Math.random() * 5;
  }

  weather.windSpeed = Math.max(0, weather.windSpeed + (Math.random() - 0.5) * 1.5);
  weather.windDirection = (weather.windDirection + (Math.random() - 0.5) * 30 + 360) % 360;

  const rand = Math.random();
  if (rand < 0.01) {
    weather.type = "rain";
    weather.intensity = 0.3 + Math.random() * 0.7;
  } else if (rand < 0.015) {
    weather.type = "storm";
    weather.intensity = 0.6 + Math.random() * 0.4;
  } else if (rand < 0.05 && weather.type !== "clear") {
    weather.type = "clear";
    weather.intensity = 0;
  }

  return weather;
}

function applyPhysicsToEntity(entity: Entity, gravity: number, dt: number): Partial<Entity> {
  let newVX = entity.velocityX;
  let newVY = entity.velocityY;

  const friction = 0.95;
  newVX *= friction;
  newVY *= friction;

  let newX = entity.posX + newVX * dt;
  let newY = entity.posY + newVY * dt;

  newX = Math.max(-500, Math.min(500, newX));
  newY = Math.max(-500, Math.min(500, newY));

  if (Math.abs(newVX) < 0.01) newVX = 0;
  if (Math.abs(newVY) < 0.01) newVY = 0;

  return {
    posX: newX,
    posY: newY,
    velocityX: newVX,
    velocityY: newVY,
  };
}

function checkCollisions(ents: Entity[]): Array<{ a: number; b: number }> {
  const collisions: Array<{ a: number; b: number }> = [];
  for (let i = 0; i < ents.length; i++) {
    for (let j = i + 1; j < ents.length; j++) {
      if (ents[i].regionId !== ents[j].regionId) continue;
      const dx = ents[i].posX - ents[j].posX;
      const dy = ents[i].posY - ents[j].posY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = (ents[i].mass + ents[j].mass) * 2;
      if (dist < minDist) {
        collisions.push({ a: ents[i].id, b: ents[j].id });
      }
    }
  }
  return collisions;
}

// === TICK ===
let tickInProgress = false;

async function physicsTick() {
  if (tickInProgress) return;
  tickInProgress = true;

  try {
    const state = await getOrCreateWorldState();
    const dt = TICK_INTERVAL_MS / 1000;

    let newTime = state.timeOfDay + TIME_SPEED;
    let newDay = state.dayNumber;
    if (newTime >= 24) {
      newTime -= 24;
      newDay++;
    }

    const newWeather = computeWeather(state);

    const seasons = ["spring", "summer", "autumn", "winter"];
    let newSeason = state.season;
    if (newDay % 30 === 0 && newDay !== state.dayNumber) {
      const idx = (seasons.indexOf(state.season) + 1) % seasons.length;
      newSeason = seasons[idx];
    }

    await db.update(worldState).set({
      timeOfDay: newTime,
      dayNumber: newDay,
      season: newSeason,
      weather: newWeather,
      lastTickAt: new Date(),
    }).where(eq(worldState.id, state.id));

    const allEntities = await db.select().from(entities);
    const updatedEntities: Entity[] = [];

    for (const entity of allEntities) {
      const updates = applyPhysicsToEntity(entity, state.globalGravity, dt);
      const updatedEntity = { ...entity, ...updates };
      updatedEntities.push(updatedEntity as Entity);
      await db.update(entities).set(updates).where(eq(entities.id, entity.id));
    }

    const collisions = checkCollisions(updatedEntities);
    for (const collision of collisions) {
      await db.insert(worldEvents).values({
        type: "collision",
        source: "physics",
        payload: { entityA: collision.a, entityB: collision.b },
      });
    }
  } catch (err) {
    console.error("[physics] tick error:", err);
  } finally {
    tickInProgress = false;
  }
}

// === ROUTES ===

app.get("/physics/health", (_req, res) => {
  res.json({ status: "ok", service: "physics" });
});

app.get("/physics/state", async (_req, res) => {
  try {
    const state = await getOrCreateWorldState();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: "Failed to get world state" });
  }
});

app.post("/physics/tick", async (_req, res) => {
  try {
    await physicsTick();
    const state = await getOrCreateWorldState();
    res.json({ success: true, state });
  } catch (err) {
    res.status(500).json({ error: "Tick failed" });
  }
});

app.get("/physics/regions", async (_req, res) => {
  try {
    const allRegions = await db.select().from(regions);
    res.json(allRegions);
  } catch (err) {
    res.status(500).json({ error: "Failed to get regions" });
  }
});

app.get("/physics/entities", async (req, res) => {
  try {
    const regionId = req.query.regionId as string | undefined;
    if (regionId) {
      const ents = await db.select().from(entities).where(eq(entities.regionId, regionId));
      res.json(ents);
    } else {
      const ents = await db.select().from(entities);
      res.json(ents);
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to get entities" });
  }
});

const moveSchema = z.object({
  entityId: z.number(),
  velocityX: z.number(),
  velocityY: z.number(),
});

app.post("/physics/move", async (req, res) => {
  try {
    const input = moveSchema.parse(req.body);
    const [updated] = await db.update(entities).set({
      velocityX: input.velocityX,
      velocityY: input.velocityY,
    }).where(eq(entities.id, input.entityId)).returning();

    if (!updated) return res.status(404).json({ error: "Entity not found" });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: "Move failed" });
  }
});

const travelSchema = z.object({
  characterId: z.number(),
  targetRegionId: z.string(),
});

app.post("/physics/travel", async (req, res) => {
  try {
    const input = travelSchema.parse(req.body);
    const [region] = await db.select().from(regions).where(eq(regions.id, input.targetRegionId));
    if (!region) return res.status(404).json({ error: "Region not found" });

    const [char] = await db.select().from(characters).where(eq(characters.id, input.characterId));
    if (!char) return res.status(404).json({ error: "Character not found" });

    if (char.regionId) {
      const [currentRegion] = await db.select().from(regions).where(eq(regions.id, char.regionId));
      if (currentRegion && !currentRegion.connectedRegions.includes(input.targetRegionId)) {
        return res.status(400).json({ error: "Region not connected" });
      }
    }

    const [updated] = await db.update(characters).set({
      regionId: input.targetRegionId,
      posX: region.mapX + region.width / 2,
      posY: region.mapY + region.height / 2,
    }).where(eq(characters.id, input.characterId)).returning();

    await db.insert(worldEvents).values({
      type: "travel",
      source: "physics",
      regionId: input.targetRegionId,
      payload: { characterId: input.characterId, from: char.regionId, to: input.targetRegionId },
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: "Travel failed" });
  }
});

// === START ===
const PORT = parseInt(process.env.PHYSICS_PORT || "5001", 10);

let tickInterval: NodeJS.Timeout;

export function startPhysicsServer() {
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[physics] microservice running on port ${PORT}`);
  });

  tickInterval = setInterval(physicsTick, TICK_INTERVAL_MS);
  console.log(`[physics] tick loop started (${TICK_INTERVAL_MS}ms interval)`);

  return server;
}

export { app as physicsApp };
