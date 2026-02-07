import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { generateImageBuffer } from "./replit_integrations/image/client";
import { db } from "./db";
import { generatedImages } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth Setup
  await setupAuth(app);
  registerAuthRoutes(app);

  // === Character Routes ===

  app.get(api.characters.me.path, async (req, res) => {
    // Auth disabled - force user
    const userId = "dev-user-id";
    const character = await storage.getCharacterByUserId(userId);
    
    if (!character) {
      return res.status(404).json({ message: "Character not found" });
    }
    res.json(character);
  });

  app.post(api.characters.create.path, async (req, res) => {
    try {
      const input = api.characters.create.input.parse(req.body);
      // Auth disabled - force user
      const userId = "dev-user-id";
      
      const existing = await storage.getCharacterByUserId(userId);
      if (existing) {
         return res.status(400).json({ message: "Character already exists" });
      }

      const character = await storage.createCharacter({ ...input, userId });
      res.status(201).json(character);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.characters.update.path, async (req, res) => {
    const characterId = Number(req.params.id);
    // Auth disabled - force user
    const userId = "dev-user-id";

    const character = await storage.getCharacter(characterId);
    if (!character || character.userId !== userId) {
      return res.status(404).json({ message: "Character not found or access denied" });
    }

    try {
      const input = api.characters.update.input.parse(req.body);
      const updated = await storage.updateCharacter(characterId, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // === Energy Routes ===

  app.post(api.energy.absorb.path, async (req, res) => {
    try {
      const input = api.energy.absorb.input.parse(req.body);
      // Auth disabled - force user
      const userId = "dev-user-id";
      
      const absorption = await storage.createAbsorption(userId, input);
      res.json(absorption);
    } catch (err) {
      if (err instanceof z.ZodError) {
         return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.get(api.energy.status.path, async (req, res) => {
    // Auth disabled - force user
    const userId = "dev-user-id";
    const active = await storage.getActiveAbsorptions(userId);
    res.json(active);
  });

  // === AI Scene Generation ===

  const CAMERA_ANGLES: Record<string, string> = {
    panorama: "wide panoramic landscape shot from a hilltop, vast horizon visible, sweeping cinematic view",
    closeup: "close-up ground level shot, detailed textures of terrain and nearby objects, shallow depth of field",
    aerial: "bird's eye aerial view looking straight down, showing terrain patterns and structures from above",
    dramatic: "dramatic low-angle shot looking upward, towering structures and sky dominating the frame, imposing perspective",
    pov: "first-person point of view at eye level, as if walking through the scene, immersive perspective",
  };

  const CAMERA_LABELS_RU: Record<string, string> = {
    panorama: "Панорама",
    closeup: "Крупный план",
    aerial: "Вид сверху",
    dramatic: "Драматичный ракурс",
    pov: "От первого лица",
  };

  const REGION_SCENE_PROMPTS: Record<string, string> = {
    forest_ancient: "an ancient primordial forest with massive twisted trees covered in bioluminescent moss and glowing fungi, ethereal green energy particles floating, mystical and dark atmosphere",
    volcano_dormant: "a dormant volcano with rivers of molten lava flowing between dark rock formations, smoke and embers rising, intense heat distortion, fiery crimson glow",
    crystal_cave: "vast underground crystal caves with enormous purple and indigo crystalline formations, psychic energy resonating, prismatic light refracting through crystals",
    sky_sanctuary: "a floating sky sanctuary above clouds, ancient stone structures suspended mid-air connected by ethereal bridges, teal aether energy swirling, celestial atmosphere",
    swamp_mist: "toxic misty swamp with dead twisted trees in murky water, thick green fog, ghostly death energy wisps, eerie and foreboding atmosphere",
    desert_crimson: "vast crimson desert with red sand dunes under a burning sky, intense solar energy radiating, heat distortion, sandstorms in the distance",
    abyss_deep: "bottomless void abyss where reality tears apart, dark purple void energy consuming fragments of reality, midnight blue darkness, terrifying emptiness",
  };

  const TIME_MODIFIERS: Record<string, string> = {
    morning: "early morning golden hour light, soft warm sunrise colors, dew and mist",
    day: "bright daylight, clear visibility, vibrant colors",
    evening: "sunset orange and purple sky, long dramatic shadows, warm golden light",
    night: "dark nighttime scene, moonlight and starlight, bioluminescent glows prominent, mysterious shadows",
  };

  const WEATHER_MODIFIERS: Record<string, string> = {
    clear: "clear sky, crisp atmosphere",
    rain: "heavy rain falling, wet reflective surfaces, dark overcast sky",
    storm: "violent thunderstorm, lightning bolts illuminating the scene, wind-swept debris",
    fog: "dense atmospheric fog, limited visibility, ethereal and mysterious",
  };

  app.get("/api/scene/angles", (_req, res) => {
    const angles = Object.entries(CAMERA_LABELS_RU).map(([id, label]) => ({ id, label }));
    res.json(angles);
  });

  const sceneGenerateSchema = z.object({
    regionId: z.enum(Object.keys(REGION_SCENE_PROMPTS) as [string, ...string[]]),
    cameraAngle: z.enum(Object.keys(CAMERA_ANGLES) as [string, ...string[]]).default("panorama"),
    timeOfDay: z.enum(["morning", "day", "evening", "night"]).default("day"),
    weather: z.enum(["clear", "rain", "storm", "fog"]).default("clear"),
  });

  app.post("/api/scene/generate", async (req, res) => {
    try {
      const parsed = sceneGenerateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      const { regionId, cameraAngle, timeOfDay, weather } = parsed.data;

      const cached = await db.select().from(generatedImages).where(
        and(
          eq(generatedImages.regionId, regionId),
          eq(generatedImages.cameraAngle, cameraAngle),
          eq(generatedImages.timeOfDay, timeOfDay),
          eq(generatedImages.weather, weather),
        )
      ).limit(1);

      if (cached.length > 0) {
        return res.json({ imageBase64: cached[0].imageBase64, cached: true, prompt: cached[0].prompt });
      }

      const regionScene = REGION_SCENE_PROMPTS[regionId];
      const cameraDesc = CAMERA_ANGLES[cameraAngle];
      const timeMod = TIME_MODIFIERS[timeOfDay] || TIME_MODIFIERS.day;
      const weatherMod = WEATHER_MODIFIERS[weather] || WEATHER_MODIFIERS.clear;

      const prompt = `Dark fantasy manhwa illustration in the style of Solo Leveling and Overgeared webtoons. ${cameraDesc}. Scene: ${regionScene}. Lighting: ${timeMod}. Weather: ${weatherMod}. Highly detailed digital art, dramatic lighting, vibrant accent colors against dark backgrounds, sharp linework, cinematic composition, 16:9 aspect ratio.`;

      const imageBuffer = await generateImageBuffer(prompt, "1024x1024");
      const imageBase64 = imageBuffer.toString("base64");

      await db.insert(generatedImages).values({
        regionId,
        cameraAngle,
        timeOfDay,
        weather,
        imageBase64,
        prompt,
      });

      res.json({ imageBase64, cached: false, prompt });
    } catch (error) {
      console.error("Error generating scene:", error);
      res.status(500).json({ error: "Failed to generate scene image" });
    }
  });

  return httpServer;
}
