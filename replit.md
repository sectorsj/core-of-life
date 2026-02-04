# Core of Life - Biopunk RPG Application

## Overview

Core of Life is a biopunk-themed RPG web application where players discover their genetic destiny, awaken chakras, and absorb energy from the world. The application features a unique character system based on genome sequences and chakra progression rather than traditional RPG classes.

Key features include:
- Character creation with procedurally generated genome sequences
- Seven-chakra energy system with visual representation
- Energy absorption mechanics tied to world regions
- Bioluminescent/organic visual aesthetic with Framer Motion animations

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with custom biopunk theme (dark organic greens, void purples, amber accents)
- **UI Components**: Shadcn/ui (Radix primitives) with New York style
- **Animations**: Framer Motion for living UI effects (pulsing chakras, DNA animations)
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: REST endpoints defined in `shared/routes.ts` with Zod schemas for type-safe request/response validation
- **Build**: Vite for frontend, esbuild for server bundling

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Key Tables**:
  - `users` - Authentication user records (Replit Auth)
  - `sessions` - Session storage for auth
  - `characters` - Player characters with genome, attributes, skills, chakras
  - `activeAbsorptions` - Tracks ongoing energy absorption activities

### Authentication
- **Provider**: Replit Auth (OpenID Connect)
- **Session Storage**: PostgreSQL via connect-pg-simple
- **Implementation**: Passport.js with custom OIDC strategy
- **Protected Routes**: Middleware checks `req.isAuthenticated()` for API endpoints

### Project Structure
```
client/           # React frontend
  src/
    components/   # UI components (ChakraVisualizer, DnaHelix, etc.)
    hooks/        # Custom React hooks (use-auth, use-characters, use-energy)
    pages/        # Route pages (Landing, Dashboard, NotFound)
    lib/          # Utilities (queryClient, utils)
server/           # Express backend
  routes.ts       # API route handlers
  storage.ts      # Database access layer
  db.ts           # Drizzle database connection
  replit_integrations/auth/  # Replit Auth setup
shared/           # Shared between client/server
  schema.ts       # Drizzle table definitions and Zod schemas
  routes.ts       # API route contracts with type definitions
  models/auth.ts  # Auth-specific table definitions
```

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries with schema-first approach
- **connect-pg-simple**: Session storage in PostgreSQL

### Authentication
- **Replit Auth**: OAuth/OIDC provider for user authentication
- **Required Environment Variables**:
  - `DATABASE_URL` - PostgreSQL connection string
  - `SESSION_SECRET` - Secret for session encryption
  - `ISSUER_URL` - OIDC issuer (defaults to Replit)
  - `REPL_ID` - Replit environment identifier

### Development Tools
- **Vite**: Frontend dev server with HMR
- **Replit Plugins**: Dev banner, cartographer, runtime error overlay (development only)

### UI/Animation Libraries
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, tooltips, etc.)
- **Framer Motion**: Animation library for organic UI effects
- **Lucide React**: Icon library