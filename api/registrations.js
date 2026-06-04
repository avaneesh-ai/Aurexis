import { promises as fs } from "node:fs";
import path from "node:path";
import { json, readJson, safeTitle } from "./_utils.js";

const memoryKey = "__aurexisRegisteredUsers";

function registryPath() {
  return process.env.AUREXIS_REGISTRY_FILE || path.join(process.cwd(), "data", "registered-users.json");
}

function sanitizeRecord(input) {
  const email = String(input.email || "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }

  return {
    email,
    name: safeTitle(input.name, email.split("@")[0]),
    mobile: String(input.mobile || "").replace(/[^\d+\-\s()]/g, "").trim(),
    plan: input.plan === "Pro" ? "Pro" : "Free",
    deviceId: safeTitle(input.deviceId, "unknown-device"),
    createdAt: input.createdAt || new Date().toISOString(),
    lastLoginAt: input.lastLoginAt || new Date().toISOString(),
    settings: {
      themeMode: input.settings?.themeMode === "dark" ? "dark" : "light",
      coWorkMode: Boolean(input.settings?.coWorkMode),
      projectSpeed: Boolean(input.settings?.projectSpeed),
      codeMode: Boolean(input.settings?.codeMode),
      friendlyMode: input.settings?.friendlyMode !== false
    }
  };
}

function upsert(users, record) {
  const cleanUsers = Array.isArray(users) ? users.filter((user) => user?.email) : [];
  const index = cleanUsers.findIndex((user) => String(user.email).toLowerCase() === record.email);

  if (index >= 0) {
    cleanUsers[index] = {
      ...cleanUsers[index],
      ...record,
      createdAt: cleanUsers[index].createdAt || record.createdAt
    };
  } else {
    cleanUsers.unshift(record);
  }

  return cleanUsers;
}

function merge(...groups) {
  return groups.flat().filter(Boolean).reduce((users, record) => {
    const clean = sanitizeRecord(record);
    return clean ? upsert(users, clean) : users;
  }, []);
}

async function readFileUsers() {
  try {
    const raw = await fs.readFile(registryPath(), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.users) ? parsed.users : [];
  } catch {
    return [];
  }
}

async function writeUsers(users) {
  globalThis[memoryKey] = users;

  try {
    await fs.mkdir(path.dirname(registryPath()), { recursive: true });
    await fs.writeFile(registryPath(), JSON.stringify({ users }, null, 2));
  } catch {
    // Some serverless hosts do not allow durable filesystem writes.
  }
}

async function readUsers() {
  return merge(await readFileUsers(), globalThis[memoryKey] || []);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    json(res, 200, {});
    return;
  }

  if (req.method === "GET") {
    const users = await readUsers();
    json(res, 200, {
      users,
      storage: "local-file-with-memory-fallback"
    });
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { error: "Use GET or POST for registrations." });
    return;
  }

  try {
    const body = await readJson(req);
    const record = sanitizeRecord(body);

    if (!record) {
      json(res, 400, { error: "A valid email is required." });
      return;
    }

    const users = upsert(await readUsers(), record);
    await writeUsers(users);

    json(res, 200, {
      ok: true,
      users,
      storage: "local-file-with-memory-fallback"
    });
  } catch (error) {
    json(res, 500, {
      error: "Registration details could not be saved.",
      detail: error.message
    });
  }
}
