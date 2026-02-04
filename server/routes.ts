import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { api } from "@shared/routes";
import { z } from "zod";

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

  return httpServer;
}
