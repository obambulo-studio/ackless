import { describe, expect, it } from "vitest";

import {
  ACTIVITY_RETENTION_MS,
  applyBlockRecords,
  applyRenameRecords,
  createEmptyActivityData,
  normalizeActivityData,
  pruneEvents,
  summarizeActivity,
} from "../src/activity-stats";

describe("activity-stats", () => {
  it("creates empty activity data", () => {
    expect(createEmptyActivityData()).toEqual({ events: [] });
  });

  it("records block events with excerpts", () => {
    const updated = applyBlockRecords(
      createEmptyActivityData(),
      "bbc.com.au",
      [{ excerpt: "Acknowledgement of Country" }],
      1000
    );

    expect(updated.events).toEqual([
      {
        type: "block",
        host: "bbc.com.au",
        timestamp: 1000,
        excerpt: "Acknowledgement of Country",
      },
    ]);
    expect(summarizeActivity(updated, 1000).blocks).toBe(1);
  });

  it("records rename events globally", () => {
    const updated = applyRenameRecords(
      createEmptyActivityData(),
      "abc.net.au",
      [
        { from: "Naarm", to: "Melbourne", count: 2 },
        { from: "nipaluna", to: "Hobart", count: 1 },
      ],
      2000
    );

    expect(updated.events).toHaveLength(3);
    expect(summarizeActivity(updated, 2000)).toMatchObject({
      blocks: 0,
      renames: 3,
      renamePairs: [
        { from: "Naarm", to: "Melbourne", count: 2 },
        { from: "nipaluna", to: "Hobart", count: 1 },
      ],
    });
  });

  it("drops events older than 24 hours", () => {
    const now = 10_000_000;
    const data = applyBlockRecords(
      createEmptyActivityData(),
      "example.com.au",
      [{ excerpt: "old" }],
      now - ACTIVITY_RETENTION_MS - 1
    );
    const fresh = applyBlockRecords(
      data,
      "example.com.au",
      [{ excerpt: "new" }],
      now
    );

    expect(pruneEvents(fresh.events, now)).toHaveLength(1);
    expect(fresh.events[0]?.excerpt).toBe("new");
  });

  it("migrates legacy recentEvents storage", () => {
    expect(
      normalizeActivityData({
        recentEvents: [
          {
            type: "block",
            host: "x.au",
            timestamp: Date.now(),
            excerpt: "Welcome to Country",
          },
        ],
      })
    ).toEqual({
      events: [
        expect.objectContaining({
          type: "block",
          host: "x.au",
          excerpt: "Welcome to Country",
        }),
      ],
    });
  });

  it("summarizes blocked items for the last 24 hours", () => {
    const now = 50_000;
    let data = createEmptyActivityData();
    data = applyBlockRecords(
      data,
      "site-a.au",
      [{ excerpt: "Acknowledgement one" }],
      now - 1000
    );
    data = applyBlockRecords(
      data,
      "site-b.au",
      [{ excerpt: "Acknowledgement two" }],
      now - 2000
    );

    const summary = summarizeActivity(data, now);
    expect(summary.blocks).toBe(2);
    expect(summary.blockEvents.map((event) => event.excerpt)).toEqual([
      "Acknowledgement two",
      "Acknowledgement one",
    ]);
  });
});
