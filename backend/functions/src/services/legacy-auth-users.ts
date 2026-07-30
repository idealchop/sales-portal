import * as fs from "fs";
import * as path from "path";

export type LegacyAuthUser = {
  localId: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  role: string | null;
  lastSignedInAt: string | null;
  createdAt: string | null;
};

type LegacyAuthUsersFile = {
  users?: LegacyAuthUser[];
};

let cachedUsers: LegacyAuthUser[] | null = null;
let cachedById: Map<string, LegacyAuthUser> | null = null;
let cachedByEmail: Map<string, LegacyAuthUser> | null = null;

function resolveDataPath(): string {
  const candidates = [
    path.join(__dirname, "../data/sr-legacy-users.json"),
    path.join(__dirname, "../../src/data/sr-legacy-users.json"),
    path.join(process.cwd(), "src/data/sr-legacy-users.json"),
    path.join(process.cwd(), "lib/data/sr-legacy-users.json"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function loadUsers(): LegacyAuthUser[] {
  if (cachedUsers) return cachedUsers;

  const filePath = resolveDataPath();
  if (!fs.existsSync(filePath)) {
    cachedUsers = [];
    cachedById = new Map();
    cachedByEmail = new Map();
    return cachedUsers;
  }

  const parsed = JSON.parse(
    fs.readFileSync(filePath, "utf8"),
  ) as LegacyAuthUsersFile;
  const users = (parsed.users ?? [])
    .map((user) => ({
      localId: String(user.localId || "").trim(),
      email: String(user.email || "").trim(),
      emailVerified: Boolean(user.emailVerified),
      displayName:
        typeof user.displayName === "string" && user.displayName.trim() ?
          user.displayName.trim() :
          null,
      role:
        typeof user.role === "string" && user.role.trim() ?
          user.role.trim() :
          null,
      lastSignedInAt:
        typeof user.lastSignedInAt === "string" && user.lastSignedInAt.trim() ?
          user.lastSignedInAt.trim() :
          null,
      createdAt:
        typeof user.createdAt === "string" && user.createdAt.trim() ?
          user.createdAt.trim() :
          null,
    }))
    .filter((user) => user.localId && user.email);

  cachedUsers = users;
  cachedById = new Map(users.map((user) => [user.localId, user]));
  cachedByEmail = new Map(
    users.map((user) => [normalizeEmail(user.email), user]),
  );
  return users;
}

export function getLegacyAuthUsers(): LegacyAuthUser[] {
  return loadUsers();
}

export function findLegacyAuthUser(input: {
  localId?: string | null;
  email?: string | null;
}): LegacyAuthUser | null {
  loadUsers();
  const localId = input.localId?.trim();
  if (localId && cachedById?.has(localId)) {
    return cachedById.get(localId) ?? null;
  }
  const email = input.email ? normalizeEmail(input.email) : "";
  if (email && cachedByEmail?.has(email)) {
    return cachedByEmail.get(email) ?? null;
  }
  return null;
}

/** Test helper — clears in-memory cache. */
export function clearLegacyAuthUsersCache(): void {
  cachedUsers = null;
  cachedById = null;
  cachedByEmail = null;
}
