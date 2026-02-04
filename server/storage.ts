import { 
  characters, activeAbsorptions, 
  type Character, type InsertCharacter, type UpdateCharacterRequest,
  type ActiveAbsorption, type StartAbsorptionRequest
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { authStorage, type IAuthStorage } from "./replit_integrations/auth/storage"; // Import auth storage

export interface IStorage extends IAuthStorage {
  // Character
  getCharacterByUserId(userId: string): Promise<Character | undefined>;
  getCharacter(id: number): Promise<Character | undefined>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  updateCharacter(id: number, updates: UpdateCharacterRequest): Promise<Character>;
  
  // Energy
  createAbsorption(userId: string, data: StartAbsorptionRequest): Promise<ActiveAbsorption>;
  getActiveAbsorptions(userId: string): Promise<ActiveAbsorption[]>;
}

export class DatabaseStorage implements IStorage {
  // Auth methods delegated to the imported authStorage or implemented here if needed.
  // Since we imported authStorage, we can use its methods or reimplement if we want a single class.
  // But Typescript might complain if we don't implement them in this class if we claim to implement IStorage.
  // Let's just delegate.
  getUser(id: string) { return authStorage.getUser(id); }
  upsertUser(user: any) { return authStorage.upsertUser(user); }

  async getCharacterByUserId(userId: string): Promise<Character | undefined> {
    const [char] = await db.select().from(characters).where(eq(characters.userId, userId));
    return char;
  }

  async getCharacter(id: number): Promise<Character | undefined> {
    const [char] = await db.select().from(characters).where(eq(characters.id, id));
    return char;
  }

  async createCharacter(insertCharacter: InsertCharacter): Promise<Character> {
    const [char] = await db.insert(characters).values(insertCharacter).returning();
    return char;
  }

  async updateCharacter(id: number, updates: UpdateCharacterRequest): Promise<Character> {
    const [char] = await db.update(characters)
      .set(updates)
      .where(eq(characters.id, id))
      .returning();
    return char;
  }

  async createAbsorption(userId: string, data: StartAbsorptionRequest): Promise<ActiveAbsorption> {
    const char = await this.getCharacterByUserId(userId);
    if (!char) throw new Error("Character not found");

    const [absorption] = await db.insert(activeAbsorptions).values({
      characterId: char.id,
      regionId: data.regionId,
      energyColor: data.energyColor,
      durationMinutes: 15, // Default from specs
      completed: false
    }).returning();
    
    return absorption;
  }

  async getActiveAbsorptions(userId: string): Promise<ActiveAbsorption[]> {
    const char = await this.getCharacterByUserId(userId);
    if (!char) return [];

    return await db.select().from(activeAbsorptions)
      .where(and(
        eq(activeAbsorptions.characterId, char.id),
        eq(activeAbsorptions.completed, false)
      ));
  }
}

export const storage = new DatabaseStorage();
