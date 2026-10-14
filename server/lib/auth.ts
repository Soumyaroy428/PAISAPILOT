import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { getCollection } from "@/server/db/mongodb";
import { UserDocument } from "@/server/models/user";

const SESSION_COOKIE_NAME = "paisapilot_session";
const SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "fallback_default_secret_for_local_development_only_replace_in_env";
  return new TextEncoder().encode(secret);
}

/**
 * Hashes a plaintext password securely using bcrypt with 12 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Compares a plaintext password against a stored bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface SessionPayload {
  userId: string;
  email: string;
  displayName: string;
}

/**
 * Creates a signed JWT session token.
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_EXPIRATION_SECONDS}s`)
    .sign(secret);
}

/**
 * Verifies a JWT session token and returns the payload if valid.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      displayName: payload.displayName as string,
    };
  } catch {
    return null;
  }
}

/**
 * Sets the session cookie on a response or cookie store.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRATION_SECONDS,
  });
}

/**
 * Clears the session cookie.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  displayName: string;
  persona: string | null;
  onboardingCompleted: boolean;
  onboardingProfile?: any;
}

/**
 * Derives the authenticated user from the verified server-side session cookie.
 * Never trusts client-provided identity parameters.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload?.userId) return null;

    const usersCol = await getCollection<UserDocument>("users");
    const user = await usersCol.findOne({ _id: new ObjectId(payload.userId) });

    if (!user || user.status === "disabled") {
      return null;
    }

    return {
      userId: user._id.toString(),
      email: user.emailNormalized,
      displayName: user.displayName,
      persona: user.persona || null,
      onboardingCompleted: Boolean(user.onboardingCompleted),
      onboardingProfile: user.onboardingProfile || null,
    };
  } catch (err) {
    console.error("Auth verification error:", err);
    return null;
  }
}

