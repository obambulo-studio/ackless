import { getStorage, setStorage } from "./shared";

export const ACTIVITY_KEY = "acklessAuActivity" as const;
export const ACTIVITY_RETENTION_MS = 24 * 60 * 60 * 1000;
export const MAX_STORED_EVENTS = 2000;

export interface BlockRecord {
  excerpt: string;
}

export interface ActivityEvent {
  type: "block" | "rename";
  host: string;
  timestamp: number;
  excerpt?: string;
  from?: string;
  to?: string;
}

export interface ActivityData {
  events: ActivityEvent[];
}

export interface RenameMatch {
  from: string;
  to: string;
  count: number;
}

export interface RenamePairSummary {
  from: string;
  to: string;
  count: number;
}

export interface ActivitySummary {
  blocks: number;
  renames: number;
  blockEvents: ActivityEvent[];
  renameEvents: ActivityEvent[];
  renamePairs: RenamePairSummary[];
}

let activityWrite: Promise<void> = Promise.resolve();

export function createEmptyActivityData(): ActivityData {
  return { events: [] };
}

export function pruneEvents(
  events: readonly ActivityEvent[],
  now = Date.now()
): ActivityEvent[] {
  const cutoff = now - ACTIVITY_RETENTION_MS;

  return events
    .filter((event) => event.timestamp >= cutoff)
    .slice(0, MAX_STORED_EVENTS);
}

export function normalizeActivityData(raw: unknown): ActivityData {
  if (typeof raw !== "object" || raw === null) {
    return createEmptyActivityData();
  }

  const data = raw as Partial<ActivityData> & {
    recentEvents?: unknown;
  };

  if (Array.isArray(data.events)) {
    return { events: normalizeEvents(data.events) };
  }

  if (Array.isArray(data.recentEvents)) {
    return { events: normalizeEvents(data.recentEvents) };
  }

  return createEmptyActivityData();
}

function normalizeEvents(raw: unknown): ActivityEvent[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const events: ActivityEvent[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const event = item as ActivityEvent;
    if (event.type !== "block" && event.type !== "rename") {
      continue;
    }
    if (typeof event.host !== "string" || typeof event.timestamp !== "number") {
      continue;
    }

    events.push({
      type: event.type,
      host: event.host,
      timestamp: event.timestamp,
      excerpt: typeof event.excerpt === "string" ? event.excerpt : undefined,
      from: typeof event.from === "string" ? event.from : undefined,
      to: typeof event.to === "string" ? event.to : undefined,
    });
  }

  return pruneEvents(events);
}

function prependEvents(
  data: ActivityData,
  events: ActivityEvent[],
  now: number
): ActivityEvent[] {
  if (events.length === 0) {
    return pruneEvents(data.events, now);
  }

  return pruneEvents([...events, ...data.events], now);
}

export function applyBlockRecords(
  data: ActivityData,
  host: string,
  blocks: readonly BlockRecord[],
  timestamp: number
): ActivityData {
  if (!host || blocks.length === 0) {
    return { events: pruneEvents(data.events, timestamp) };
  }

  const events = blocks.map((block) => ({
    type: "block" as const,
    host,
    timestamp,
    excerpt: block.excerpt,
  }));

  return { events: prependEvents(data, events, timestamp) };
}

export function applyRenameRecords(
  data: ActivityData,
  host: string,
  matches: readonly RenameMatch[],
  timestamp: number
): ActivityData {
  if (!host || matches.length === 0) {
    return { events: pruneEvents(data.events, timestamp) };
  }

  const events: ActivityEvent[] = [];
  for (const match of matches) {
    for (let index = 0; index < match.count; index += 1) {
      events.push({
        type: "rename",
        host,
        timestamp,
        from: match.from,
        to: match.to,
      });
    }
  }

  return { events: prependEvents(data, events, timestamp) };
}

export function summarizeActivity(
  data: ActivityData,
  now = Date.now()
): ActivitySummary {
  const recent = pruneEvents(data.events, now);
  const blockEvents = recent.filter((event) => event.type === "block");
  const renameEvents = recent.filter((event) => event.type === "rename");
  const pairCounts = new Map<string, RenamePairSummary>();

  for (const event of renameEvents) {
    if (!event.from || !event.to) {
      continue;
    }

    const key = `${event.from}\0${event.to}`;
    const existing = pairCounts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      pairCounts.set(key, { from: event.from, to: event.to, count: 1 });
    }
  }

  const renamePairs = [...pairCounts.values()].sort(
    (left, right) =>
      right.count - left.count ||
      left.from.localeCompare(right.from) ||
      left.to.localeCompare(right.to)
  );

  return {
    blocks: blockEvents.length,
    renames: renameEvents.length,
    blockEvents,
    renameEvents,
    renamePairs,
  };
}

async function loadActivityData(): Promise<ActivityData> {
  const result = await getStorage("local", {
    [ACTIVITY_KEY]: null as ActivityData | null,
  });

  const stored = result[ACTIVITY_KEY];
  const data =
    stored !== null && stored !== undefined
      ? normalizeActivityData(stored)
      : createEmptyActivityData();

  const pruned = { events: pruneEvents(data.events) };
  if (pruned.events.length !== data.events.length) {
    await saveActivityData(pruned);
  }

  return pruned;
}

async function saveActivityData(data: ActivityData): Promise<void> {
  await setStorage("local", {
    [ACTIVITY_KEY]: { events: pruneEvents(data.events) },
  });
}

export async function getActivityData(): Promise<ActivityData> {
  return loadActivityData();
}

export async function getActivitySummary(): Promise<ActivitySummary> {
  const data = await getActivityData();
  return summarizeActivity(data);
}

export async function recordBlocks(
  host: string,
  blocks: readonly BlockRecord[]
): Promise<void> {
  if (!host || blocks.length === 0) {
    return;
  }

  activityWrite = activityWrite.then(async () => {
    const data = await loadActivityData();
    const updated = applyBlockRecords(data, host, blocks, Date.now());
    await saveActivityData(updated);
  });

  await activityWrite;
}

export async function recordRenames(
  host: string,
  matches: readonly RenameMatch[]
): Promise<void> {
  if (!host || matches.length === 0) {
    return;
  }

  activityWrite = activityWrite.then(async () => {
    const data = await loadActivityData();
    const updated = applyRenameRecords(data, host, matches, Date.now());
    await saveActivityData(updated);
  });

  await activityWrite;
}

export async function clearActivityData(): Promise<void> {
  activityWrite = activityWrite.then(async () => {
    await saveActivityData(createEmptyActivityData());
  });

  await activityWrite;
}

export function serializeActivityData(data: ActivityData): string {
  return JSON.stringify(data, null, 2);
}

export function downloadActivityExport(data: ActivityData, filename?: string): void {
  const blob = new Blob([serializeActivityData(data)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    filename ?? `ackless-activity-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
