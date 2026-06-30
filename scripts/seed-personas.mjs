#!/usr/bin/env node
/**
 * Seed each persona's long-term memory in Mem0.
 *
 * Every persona in src/data/personas.json has its own Mem0 namespace
 * (keyed by the persona `id` as the Mem0 `user_id`). This script writes
 * each persona's `seedMemories` into that namespace so the personas
 * "remember" distinct facts the moment the app loads.
 *
 * Usage:
 *   MEM0_API_KEY=xxx node scripts/seed-personas.mjs           # add seed memories
 *   MEM0_API_KEY=xxx node scripts/seed-personas.mjs --reset   # wipe each
 *                                                             # persona's memory first
 *
 * Re-running without --reset will append (and may duplicate) memories.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const MEM0_API_BASE = "https://api.mem0.ai";
const __dirname = dirname(fileURLToPath(import.meta.url));

const apiKey = process.env.MEM0_API_KEY;
if (!apiKey) {
  console.error("Error: MEM0_API_KEY environment variable is required.");
  process.exit(1);
}

const reset = process.argv.includes("--reset");
const headers = {
  "Content-Type": "application/json",
  Accept: "application/json",
  Authorization: `Token ${apiKey}`,
};

const personasPath = join(__dirname, "..", "src", "data", "personas.json");
const personas = JSON.parse(readFileSync(personasPath, "utf8"));

async function listMemoryIds(userId) {
  const res = await fetch(
    `${MEM0_API_BASE}/v1/memories/?user_id=${encodeURIComponent(userId)}`,
    { headers }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const items = Array.isArray(data) ? data : data.results || [];
  return items.map((m) => m.id).filter(Boolean);
}

async function deleteMemory(id) {
  const res = await fetch(`${MEM0_API_BASE}/v1/memories/${id}/`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    console.warn(`  ! failed to delete memory ${id} (HTTP ${res.status})`);
  }
}

async function clearPersona(userId) {
  const ids = await listMemoryIds(userId);
  for (const id of ids) await deleteMemory(id);
  console.log(`  cleared ${ids.length} existing memorie(s)`);
}

async function seedPersona(persona) {
  // infer:false stores each message verbatim instead of running Mem0's
  // LLM extraction, so the seeded facts land exactly as written.
  const res = await fetch(`${MEM0_API_BASE}/v1/memories/`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      user_id: persona.id,
      infer: false,
      messages: persona.seedMemories.map((content) => ({
        role: "user",
        content,
      })),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
}

for (const persona of personas) {
  console.log(`\n${persona.emoji} ${persona.name} (${persona.id})`);
  try {
    if (reset) await clearPersona(persona.id);
    await seedPersona(persona);
    console.log(`  seeded ${persona.seedMemories.length} memorie(s)`);
  } catch (e) {
    console.error(`  ! ${e.message}`);
    process.exitCode = 1;
  }
}

console.log("\nDone.");
