import express from "express";
import { db } from "../db";
import { metaphysicsState, characters, worldEvents, worldState, type MetaphysicsState } from "@shared/schema";
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { z } from "zod";

const app = express();
app.use(express.json());

const TICK_INTERVAL_MS = 5000;

const CHAKRA_KEYS = [
  "muladhara", "svadhisthana", "manipura",
  "anahata", "vishuddha", "ajna", "sahasrara"
] as const;

const EVOLUTION_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800];

function computeKarmaShift(karma: number, actions: any[]): number {
  let shift = 0;
  for (const action of actions) {
    if (action.type === "heal" || action.type === "help") shift += 0.5;
    if (action.type === "harm" || action.type === "destroy") shift -= 0.5;
  }
  return Math.max(-100, Math.min(100, karma + shift));
}

function processChakraFlux(
  currentChakras: MetaphysicsState["chakraFlux"],
  worldTime: number
): MetaphysicsState["chakraFlux"] {
  if (!currentChakras) return null;

  const flux = { ...currentChakras };
  const hour = worldTime % 24;

  const chakraTimeMap: Record<string, [number, number]> = {
    muladhara: [4, 8],
    svadhisthana: [6, 10],
    manipura: [10, 14],
    anahata: [12, 16],
    vishuddha: [14, 18],
    ajna: [20, 24],
    sahasrara: [0, 4],
  };

  for (const key of CHAKRA_KEYS) {
    const [start, end] = chakraTimeMap[key];
    const inPeakTime = (start < end) ? (hour >= start && hour < end) : (hour >= start || hour < end);
    const modifier = inPeakTime ? 0.5 : -0.1;
    flux[key] = Math.max(0, Math.min(100, (flux[key] || 0) + modifier));
  }

  return flux;
}

function processActiveEffects(
  effects: NonNullable<MetaphysicsState["activeEffects"]>
): NonNullable<MetaphysicsState["activeEffects"]> {
  return effects
    .map(e => ({ ...e, remainingTicks: e.remainingTicks - 1 }))
    .filter(e => e.remainingTicks > 0);
}

function computeEvolution(state: MetaphysicsState): { level: number; progress: number } {
  const chakraSum = state.chakraFlux
    ? Object.values(state.chakraFlux).reduce((s, v) => s + v, 0)
    : 0;

  const karmaBonus = Math.max(0, state.karma) * 0.1;
  const newProgress = state.evolutionProgress + (chakraSum / 700) * 0.5 + karmaBonus * 0.01;

  let newLevel = state.spiritualLevel;
  if (newLevel < EVOLUTION_THRESHOLDS.length - 1 && newProgress >= EVOLUTION_THRESHOLDS[newLevel]) {
    newLevel++;
  }

  return { level: newLevel, progress: newProgress };
}

// === TICK ===
let tickInProgress = false;

async function metaphysicsTick() {
  if (tickInProgress) return;
  tickInProgress = true;

  try {
    const [ws] = await db.select().from(worldState);
    const currentTime = ws?.timeOfDay || 12;

    const allStates = await db.select().from(metaphysicsState);

    for (const state of allStates) {
      const newFlux = processChakraFlux(state.chakraFlux, currentTime);
      const newEffects = processActiveEffects(state.activeEffects || []);
      const { level, progress } = computeEvolution(state);

      await db.update(metaphysicsState).set({
        chakraFlux: newFlux,
        activeEffects: newEffects,
        spiritualLevel: level,
        evolutionProgress: progress,
      }).where(eq(metaphysicsState.id, state.id));

      if (state.characterId) {
        const [char] = await db.select().from(characters).where(eq(characters.id, state.characterId));
        if (char && newFlux) {
          const syncedChakras = { ...char.chakras };
          for (const key of CHAKRA_KEYS) {
            const flux = newFlux[key] || 0;
            syncedChakras[key] = Math.max(0, Math.min(100, syncedChakras[key] + flux * 0.01));
          }
          await db.update(characters).set({ chakras: syncedChakras }).where(eq(characters.id, char.id));
        }
      }
    }
  } catch (err) {
    console.error("[metaphysics] tick error:", err);
  } finally {
    tickInProgress = false;
  }
}

// === ROUTES ===

app.get("/metaphysics/health", (_req, res) => {
  res.json({ status: "ok", service: "metaphysics" });
});

app.get("/metaphysics/state", async (req, res) => {
  try {
    const characterId = req.query.characterId ? Number(req.query.characterId) : undefined;
    if (characterId) {
      const [state] = await db.select().from(metaphysicsState)
        .where(eq(metaphysicsState.characterId, characterId));
      if (!state) {
        const [created] = await db.insert(metaphysicsState).values({
          characterId,
          karma: 0,
          spiritualLevel: 1,
          chakraFlux: {
            muladhara: 10, svadhisthana: 5, manipura: 5,
            anahata: 5, vishuddha: 5, ajna: 2, sahasrara: 1,
          },
          activeEffects: [],
          evolutionProgress: 0,
        }).returning();
        return res.json(created);
      }
      return res.json(state);
    }
    const all = await db.select().from(metaphysicsState);
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: "Failed to get metaphysics state" });
  }
});

app.post("/metaphysics/tick", async (_req, res) => {
  try {
    await metaphysicsTick();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Tick failed" });
  }
});

const energizeSchema = z.object({
  characterId: z.number(),
  chakra: z.enum(["muladhara", "svadhisthana", "manipura", "anahata", "vishuddha", "ajna", "sahasrara"]),
  amount: z.number().min(1).max(50),
});

app.post("/metaphysics/energize", async (req, res) => {
  try {
    const input = energizeSchema.parse(req.body);
    let [state] = await db.select().from(metaphysicsState)
      .where(eq(metaphysicsState.characterId, input.characterId));

    if (!state) {
      [state] = await db.insert(metaphysicsState).values({
        characterId: input.characterId,
        karma: 0,
        spiritualLevel: 1,
        chakraFlux: {
          muladhara: 10, svadhisthana: 5, manipura: 5,
          anahata: 5, vishuddha: 5, ajna: 2, sahasrara: 1,
        },
        activeEffects: [],
        evolutionProgress: 0,
      }).returning();
    }

    const flux = { ...(state.chakraFlux || {}) } as any;
    flux[input.chakra] = Math.min(100, (flux[input.chakra] || 0) + input.amount);

    const [updated] = await db.update(metaphysicsState).set({
      chakraFlux: flux,
    }).where(eq(metaphysicsState.id, state.id)).returning();

    await db.insert(worldEvents).values({
      type: "energize",
      source: "metaphysics",
      payload: { characterId: input.characterId, chakra: input.chakra, amount: input.amount },
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: "Energize failed" });
  }
});

const karmaSchema = z.object({
  characterId: z.number(),
  action: z.string(),
  amount: z.number(),
});

app.post("/metaphysics/karma", async (req, res) => {
  try {
    const input = karmaSchema.parse(req.body);
    let [state] = await db.select().from(metaphysicsState)
      .where(eq(metaphysicsState.characterId, input.characterId));

    if (!state) {
      [state] = await db.insert(metaphysicsState).values({
        characterId: input.characterId,
        karma: 0,
        spiritualLevel: 1,
        chakraFlux: {
          muladhara: 10, svadhisthana: 5, manipura: 5,
          anahata: 5, vishuddha: 5, ajna: 2, sahasrara: 1,
        },
        activeEffects: [],
        evolutionProgress: 0,
      }).returning();
    }

    const newKarma = Math.max(-100, Math.min(100, state.karma + input.amount));
    const [updated] = await db.update(metaphysicsState).set({
      karma: newKarma,
    }).where(eq(metaphysicsState.id, state.id)).returning();

    await db.insert(worldEvents).values({
      type: "karma_change",
      source: "metaphysics",
      payload: { characterId: input.characterId, action: input.action, amount: input.amount, newKarma },
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: "Karma update failed" });
  }
});

app.post("/metaphysics/evolve", async (req, res) => {
  try {
    const { characterId } = z.object({ characterId: z.number() }).parse(req.body);
    const [state] = await db.select().from(metaphysicsState)
      .where(eq(metaphysicsState.characterId, characterId));

    if (!state) return res.status(404).json({ error: "No metaphysics state found" });

    const { level, progress } = computeEvolution(state);

    if (level > state.spiritualLevel) {
      const [updated] = await db.update(metaphysicsState).set({
        spiritualLevel: level,
        evolutionProgress: progress,
      }).where(eq(metaphysicsState.id, state.id)).returning();

      await db.insert(worldEvents).values({
        type: "evolution",
        source: "metaphysics",
        payload: { characterId, newLevel: level, progress },
      });

      return res.json({ evolved: true, state: updated });
    }

    res.json({ evolved: false, state, nextThreshold: EVOLUTION_THRESHOLDS[level] || null });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: "Evolution check failed" });
  }
});

app.get("/metaphysics/effects", async (req, res) => {
  try {
    const characterId = Number(req.query.characterId);
    if (isNaN(characterId)) return res.status(400).json({ error: "characterId required" });

    const [state] = await db.select().from(metaphysicsState)
      .where(eq(metaphysicsState.characterId, characterId));

    res.json(state?.activeEffects || []);
  } catch (err) {
    res.status(500).json({ error: "Failed to get effects" });
  }
});

// === START ===
const PORT = parseInt(process.env.METAPHYSICS_PORT || "5002", 10);

let tickInterval: NodeJS.Timeout;

export function startMetaphysicsServer() {
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[metaphysics] microservice running on port ${PORT}`);
  });

  tickInterval = setInterval(metaphysicsTick, TICK_INTERVAL_MS);
  console.log(`[metaphysics] tick loop started (${TICK_INTERVAL_MS}ms interval)`);

  return server;
}

export { app as metaphysicsApp };
