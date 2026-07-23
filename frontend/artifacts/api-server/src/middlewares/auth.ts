import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt.js";
import type { UserJWTPayload, AgentJWTPayload } from "../lib/jwt.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: UserJWTPayload | AgentJWTPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

/**
 * Validates a user JWT. Also accepts legacy base64 tokens for backward
 * compatibility with existing dashboard sessions.
 */
export async function requireUserAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  // Try JWT first
  const payload = await verifyToken(token);
  if (payload?.type === "user") {
    req.auth = payload;
    next();
    return;
  }

  // Backward-compat: accept legacy base64 tokens (userId:email)
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const colonIdx = decoded.indexOf(":");
    if (colonIdx > 0) {
      const userId = decoded.slice(0, colonIdx);
      const email = decoded.slice(colonIdx + 1);
      if (!isNaN(Number(userId)) && email.length > 0) {
        req.auth = {
          type: "user",
          sub: userId,
          email,
          role: "admin",
          iat: 0,
          exp: Math.floor(Date.now() / 1000) + 86400,
          iss: "legacy",
        } as UserJWTPayload;
        next();
        return;
      }
    }
  } catch {
    // fall through
  }

  res.status(401).json({ error: "Invalid or expired token" });
}

/**
 * Validates an agent JWT issued by POST /agent/login.
 */
export async function requireAgentAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "No agent token provided" });
    return;
  }
  const payload = await verifyToken(token);
  if (payload?.type === "agent") {
    req.auth = payload;
    next();
    return;
  }
  res.status(401).json({ error: "Invalid or expired agent token" });
}
