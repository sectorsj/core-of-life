import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export * from "./models/auth";

// === TABLE DEFINITIONS ===

export const characters = pgTable("characters", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Links to auth.users.id
  name: text("name").notNull().default("Unnamed"),
  selfTitle: text("self_title"), // The "Class" name the player chooses
  genome: text("genome").notNull(), // e.g., "ATAT|CGCG|..."
  attributes: jsonb("attributes").notNull().$type<{
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  }>(),
  skills: jsonb("skills").notNull().$type<string[]>(), // Array of skill IDs/names
  chakras: jsonb("chakras").notNull().$type<{
    muladhara: number; // Root
    svadhisthana: number; // Sacral
    manipura: number; // Solar Plexus
    anahata: number; // Heart
    vishuddha: number; // Throat
    ajna: number; // Third Eye
    sahasrara: number; // Crown
  }>(),
  energy: integer("energy").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activeAbsorptions = pgTable("active_absorptions", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id").notNull().references(() => characters.id),
  regionId: text("region_id").notNull(),
  energyColor: text("energy_color").notNull(), // e.g., "green"
  startedAt: timestamp("started_at").defaultNow().notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(15),
  completed: boolean("completed").default(false).notNull(),
});

// === SCHEMAS ===

export const insertCharacterSchema = createInsertSchema(characters).omit({ 
  id: true, 
  createdAt: true,
  userId: true 
});

export const insertAbsorptionSchema = createInsertSchema(activeAbsorptions).omit({
  id: true,
  startedAt: true,
  completed: true
});

// === TYPES ===

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type ActiveAbsorption = typeof activeAbsorptions.$inferSelect;

export type CreateCharacterRequest = InsertCharacter;
export type UpdateCharacterRequest = Partial<InsertCharacter>;

export type StartAbsorptionRequest = {
  regionId: string;
  energyColor: string;
};
