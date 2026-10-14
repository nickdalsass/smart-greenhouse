import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextFunction, Request, Response } from "express";
import pool from "./db.js";

const scryptAsync = promisify(scrypt);

const COOKIE = "greenhouse_session";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionAccount = { id: number; greenhouse_name: string };

declare global {
  namespace Express {
    interface Request {
      account?: SessionAccount;
    }
  }
}

function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

function apiToken(): string | undefined {
  return process.env.API_TOKEN || undefined;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt.toString("base64url")}.${hash.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [saltB64, hashB64] = stored.split(".");
  if (!saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, "base64url");
  const expected = Buffer.from(hashB64, "base64url");
  const actual = (await scryptAsync(password, salt, 64)) as Buffer;
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function signSession(accountId: number): string {
  const exp = Date.now() + MAX_AGE_MS;
  const payload = `${accountId}.${exp}`;
  const sig = createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

function verifySession(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [idStr, expStr, sig] = parts;
  const payload = `${idStr}.${expStr}`;
  const expected = createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  const accountId = Number(idStr);
  if (!Number.isInteger(accountId) || accountId < 1) return null;
  return accountId;
}

function parseCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function setSessionCookie(res: Response, accountId: number): void {
  const token = signSession(accountId);
  const maxAge = Math.floor(MAX_AGE_MS / 1000);
  // ponytail: Secure only when HTTPS; LAN/dev is plain HTTP
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
  );
}

export function clearSessionCookie(res: Response): void {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
}

async function loadAccount(id: number): Promise<SessionAccount | null> {
  const { rows } = await pool.query<{ id: number; greenhouse_name: string }>(
    `SELECT id, greenhouse_name FROM accounts WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function requireSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = parseCookie(req.headers.cookie, COOKIE);
    if (!token) {
      res.status(401).json({ error: "not authenticated" });
      return;
    }
    const accountId = verifySession(token);
    if (accountId == null) {
      clearSessionCookie(res);
      res.status(401).json({ error: "not authenticated" });
      return;
    }
    const account = await loadAccount(accountId);
    if (!account) {
      clearSessionCookie(res);
      res.status(401).json({ error: "not authenticated" });
      return;
    }
    req.account = account;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "auth failed" });
  }
}

export function requirePiToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = apiToken();
  if (!expected) {
    res.status(503).json({ error: "API_TOKEN not configured" });
    return;
  }
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "missing bearer token" });
    return;
  }
  const got = header.slice("Bearer ".length);
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401).json({ error: "invalid bearer token" });
    return;
  }
  next();
}

function credentialsFromBody(body: unknown): {
  greenhouseName: string;
  password: string;
} | null {
  const greenhouseName = (body as { greenhouse_name?: string })?.greenhouse_name;
  const password = (body as { password?: string })?.password;
  if (!greenhouseName?.trim() || typeof password !== "string" || !password) {
    return null;
  }
  return { greenhouseName: greenhouseName.trim(), password };
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const creds = credentialsFromBody(req.body);
  if (!creds) {
    res.status(400).json({ error: "greenhouse_name and password required" });
    return;
  }

  try {
    const { rows } = await pool.query<{
      id: number;
      greenhouse_name: string;
      password_hash: string;
    }>(
      `SELECT id, greenhouse_name, password_hash
       FROM accounts WHERE greenhouse_name = $1`,
      [creds.greenhouseName],
    );
    const row = rows[0];
    if (!row || !(await verifyPassword(creds.password, row.password_hash))) {
      res.status(401).json({ error: "invalid credentials" });
      return;
    }
    setSessionCookie(res, row.id);
    res.json({ id: row.id, greenhouse_name: row.greenhouse_name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "login failed" });
  }
}

export async function signupHandler(req: Request, res: Response): Promise<void> {
  const creds = credentialsFromBody(req.body);
  if (!creds) {
    res.status(400).json({ error: "greenhouse_name and password required" });
    return;
  }
  if (creds.password.length < 4) {
    res.status(400).json({ error: "password must be at least 4 characters" });
    return;
  }

  try {
    const passwordHash = await hashPassword(creds.password);
    const { rows } = await pool.query<{ id: number; greenhouse_name: string }>(
      `INSERT INTO accounts (greenhouse_name, password_hash)
       VALUES ($1, $2)
       RETURNING id, greenhouse_name`,
      [creds.greenhouseName, passwordHash],
    );
    setSessionCookie(res, rows[0].id);
    res.status(201).json({ id: rows[0].id, greenhouse_name: rows[0].greenhouse_name });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "23505") {
      res.status(409).json({ error: "greenhouse name already taken" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "signup failed" });
  }
}

export function logoutHandler(_req: Request, res: Response): void {
  clearSessionCookie(res);
  res.json({ ok: true });
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  try {
    const token = parseCookie(req.headers.cookie, COOKIE);
    if (!token) {
      res.status(401).json({ error: "not authenticated" });
      return;
    }
    const accountId = verifySession(token);
    if (accountId == null) {
      clearSessionCookie(res);
      res.status(401).json({ error: "not authenticated" });
      return;
    }
    const account = await loadAccount(accountId);
    if (!account) {
      clearSessionCookie(res);
      res.status(401).json({ error: "not authenticated" });
      return;
    }
    res.json(account);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "auth failed" });
  }
}
