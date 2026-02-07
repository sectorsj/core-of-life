import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export * from "./models/auth";

// === CHARACTER TABLES ===

export const characters = pgTable("characters", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull().default("Unnamed"),
  selfTitle: text("self_title"),
  genome: text("genome").notNull(),
  attributes: jsonb("attributes").notNull().$type<{
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  }>(),
  skills: jsonb("skills").notNull().$type<string[]>(),
  chakras: jsonb("chakras").notNull().$type<{
    muladhara: number;
    svadhisthana: number;
    manipura: number;
    anahata: number;
    vishuddha: number;
    ajna: number;
    sahasrara: number;
  }>(),
  energy: integer("energy").notNull().default(0),
  regionId: text("region_id").default("forest_ancient"),
  posX: real("pos_x").default(0),
  posY: real("pos_y").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activeAbsorptions = pgTable("active_absorptions", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id").notNull().references(() => characters.id),
  regionId: text("region_id").notNull(),
  energyColor: text("energy_color").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(15),
  completed: boolean("completed").default(false).notNull(),
});

// === WORLD ENGINE TABLES ===

export const regions = pgTable("regions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameRu: text("name_ru").notNull(),
  biome: text("biome").notNull(),
  description: text("description").notNull(),
  descriptionRu: text("description_ru").notNull(),
  mapX: real("map_x").notNull().default(0),
  mapY: real("map_y").notNull().default(0),
  width: real("width").notNull().default(100),
  height: real("height").notNull().default(100),
  color: text("color").notNull().default("#228B22"),
  connectedRegions: jsonb("connected_regions").notNull().$type<string[]>(),
  hazardLevel: integer("hazard_level").notNull().default(1),
  energyType: text("energy_type").notNull().default("neutral"),
});

export const worldState = pgTable("world_state", {
  id: serial("id").primaryKey(),
  timeOfDay: real("time_of_day").notNull().default(0),
  dayNumber: integer("day_number").notNull().default(1),
  season: text("season").notNull().default("spring"),
  globalGravity: real("global_gravity").notNull().default(9.81),
  weather: jsonb("weather").notNull().$type<{
    type: string;
    intensity: number;
    windDirection: number;
    windSpeed: number;
    temperature: number;
  }>(),
  lastTickAt: timestamp("last_tick_at").defaultNow(),
});

export const entities = pgTable("entities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  regionId: text("region_id").notNull(),
  posX: real("pos_x").notNull().default(0),
  posY: real("pos_y").notNull().default(0),
  velocityX: real("velocity_x").notNull().default(0),
  velocityY: real("velocity_y").notNull().default(0),
  mass: real("mass").notNull().default(1),
  health: integer("health").notNull().default(100),
  state: text("state").notNull().default("idle"),
  properties: jsonb("properties").$type<Record<string, any>>(),
});

export const metaphysicsState = pgTable("metaphysics_state", {
  id: serial("id").primaryKey(),
  entityId: integer("entity_id"),
  characterId: integer("character_id"),
  karma: real("karma").notNull().default(0),
  spiritualLevel: integer("spiritual_level").notNull().default(1),
  chakraFlux: jsonb("chakra_flux").$type<{
    muladhara: number;
    svadhisthana: number;
    manipura: number;
    anahata: number;
    vishuddha: number;
    ajna: number;
    sahasrara: number;
  }>(),
  activeEffects: jsonb("active_effects").$type<Array<{
    id: string;
    name: string;
    type: string;
    power: number;
    duration: number;
    remainingTicks: number;
  }>>(),
  evolutionProgress: real("evolution_progress").notNull().default(0),
});

export const worldEvents = pgTable("world_events", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  source: text("source").notNull(),
  regionId: text("region_id"),
  payload: jsonb("payload").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === AI IMAGE CACHE ===

export const generatedImages = pgTable("generated_images", {
  id: serial("id").primaryKey(),
  regionId: text("region_id").notNull(),
  cameraAngle: text("camera_angle").notNull(),
  timeOfDay: text("time_of_day").notNull(),
  weather: text("weather").notNull(),
  imageBase64: text("image_base64").notNull(),
  prompt: text("prompt").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const insertRegionSchema = createInsertSchema(regions);

export const insertEntitySchema = createInsertSchema(entities).omit({
  id: true,
});

export const insertWorldStateSchema = createInsertSchema(worldState).omit({
  id: true,
  lastTickAt: true,
});

export const insertMetaphysicsStateSchema = createInsertSchema(metaphysicsState).omit({
  id: true,
});

export const insertWorldEventSchema = createInsertSchema(worldEvents).omit({
  id: true,
  createdAt: true,
});

// === TYPES ===

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type ActiveAbsorption = typeof activeAbsorptions.$inferSelect;
export type Region = typeof regions.$inferSelect;
export type WorldState = typeof worldState.$inferSelect;
export type Entity = typeof entities.$inferSelect;
export type MetaphysicsState = typeof metaphysicsState.$inferSelect;
export type WorldEvent = typeof worldEvents.$inferSelect;

export const insertGeneratedImageSchema = createInsertSchema(generatedImages).omit({
  id: true,
  createdAt: true,
});

export type InsertGeneratedImage = z.infer<typeof insertGeneratedImageSchema>;
export type GeneratedImage = typeof generatedImages.$inferSelect;

export type CreateCharacterRequest = InsertCharacter;
export type UpdateCharacterRequest = Partial<InsertCharacter>;

export type StartAbsorptionRequest = {
  regionId: string;
  energyColor: string;
};
