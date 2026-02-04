import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  return session({
    name: 'core_of_life_session',
    secret: process.env.SESSION_SECRET!,
    resave: true,
    saveUninitialized: true,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: false, 
      maxAge: sessionTtl,
      sameSite: 'lax',
      path: '/',
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  try {
    await authStorage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    });
  } catch (error) {
    console.error("Error upserting user:", error);
    // Continue even if database storage fails for the session
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Only attempt OIDC config if not in a restricted environment
  let config: any;
  try {
    config = await getOidcConfig();
  } catch (error) {
    console.warn("OIDC configuration failed, falling back to local-only mode:", error);
  }

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    if (!config) return; // Cannot ensure strategy without OIDC config
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: any, cb) => {
    cb(null, JSON.stringify(user));
  });
  
  passport.deserializeUser((userStr: string, cb) => {
    try {
      cb(null, JSON.parse(userStr));
    } catch (e) {
      cb(e);
    }
  });

  app.get("/api/login", (req, res, next) => {
    if (!config) {
      return res.status(503).send("Authentication service currently unavailable. Please use Test Login.");
    }
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/login-test", async (req, res) => {
    console.log("Test login requested");
    try {
      const testClaims = {
        sub: "test-user-id",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        profile_image_url: null,
        exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 30, // 30 days for testing
      };

      await upsertUser(testClaims);
      console.log("Test user processed");
      
      const user = {
        claims: testClaims,
        expires_at: testClaims.exp,
      };

      req.login(user, (err) => {
        if (err) {
          console.error("Login failed:", err);
          return res.status(500).send("Login failed");
        }
        
        req.session.save((err) => {
          if (err) {
            console.error("Session save failed:", err);
            return res.status(500).send("Session save failed");
          }
          console.log("Test login successful, redirecting to dashboard");
          res.redirect("/");
        });
      });
    } catch (error) {
      console.error("Test login error:", error);
      res.status(500).send("Internal server error during test login");
    }
  });

  app.get("/api/callback", (req, res, next) => {
    if (!config) return res.redirect("/");
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  // Authentication disabled for development/testing
  if (!req.user) {
    req.user = {
      claims: {
        sub: "dev-user-id",
        email: "dev@example.com",
        first_name: "Developer",
        last_name: "User",
      }
    };
  }
  return next();
};
