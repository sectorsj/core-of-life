import { z } from 'zod';
import { insertCharacterSchema, characters, activeAbsorptions } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  characters: {
    // Get the current user's character (single character per user for MVP)
    me: {
      method: 'GET' as const,
      path: '/api/characters/me',
      responses: {
        200: z.custom<typeof characters.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/characters',
      input: insertCharacterSchema,
      responses: {
        201: z.custom<typeof characters.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/characters/:id',
      input: insertCharacterSchema.partial(),
      responses: {
        200: z.custom<typeof characters.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },
  energy: {
    absorb: {
      method: 'POST' as const,
      path: '/api/energy/absorb',
      input: z.object({
        regionId: z.string(),
        energyColor: z.string(),
      }),
      responses: {
        200: z.custom<typeof activeAbsorptions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    status: {
      method: 'GET' as const,
      path: '/api/energy/status',
      responses: {
        200: z.array(z.custom<typeof activeAbsorptions.$inferSelect>()),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
