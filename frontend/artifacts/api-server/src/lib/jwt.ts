import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";

export interface UserJWTPayload extends JWTPayload {
  type: "user";
  email: string;
  role: string;
}

export interface AgentJWTPayload extends JWTPayload {
  type: "agent";
  deviceId: number;
  userId: number;
}

function getSecret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET ?? "csr-dev-secret-CHANGE-IN-PRODUCTION"
  );
}

export async function signUserToken(
  userId: number,
  email: string,
  role: string
): Promise<string> {
  return new SignJWT({ email, role, type: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime("24h")
    .setIssuer("csr")
    .sign(getSecret());
}

export async function signAgentToken(
  deviceId: number,
  userId: number
): Promise<string> {
  return new SignJWT({ deviceId, userId, type: "agent" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(deviceId))
    .setIssuedAt()
    .setExpirationTime("1h")
    .setIssuer("csr")
    .sign(getSecret());
}

export async function verifyToken(
  token: string
): Promise<UserJWTPayload | AgentJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { issuer: "csr" });
    return payload as UserJWTPayload | AgentJWTPayload;
  } catch {
    return null;
  }
}
