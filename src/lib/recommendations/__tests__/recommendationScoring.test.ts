/**
 * Unit tests for the recommendation scoring engine.
 *
 * Run with:
 *   npx tsx src/lib/recommendations/__tests__/recommendationScoring.test.ts
 *
 * These tests are fully self-contained — they do NOT require a Supabase
 * connection because the scoring engine is pure TypeScript with no I/O.
 *
 * Tests marked [LIVE] require a configured Supabase environment and are
 * documented at the bottom as manual testing steps.
 */

import assert from "node:assert/strict";
import {
  scoreCommunity,
  deriveReason,
  rankCommunities,
  INTEREST_KEYWORDS,
  SKILL_KEYWORDS,
} from "../recommendationScoring";
import type { CommunityWithCount, UserSignals } from "../recommendationTypes";

// ── Test helpers ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ ${name}\n    ${msg}`);
    failed++;
  }
}

function suite(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const now = new Date().toISOString();
const oldDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(); // 120 days ago
const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago

function makeCommunity(overrides: Partial<CommunityWithCount> = {}): CommunityWithCount {
  return {
    id: "c1",
    name: "Test Community",
    goal: "A community for testing",
    description: null,
    max_members: 50,
    member_count: 5,
    created_at: recentDate,
    ...overrides,
  };
}

function makeSignals(overrides: Partial<UserSignals> = {}): UserSignals {
  return {
    interests: [],
    skills: [],
    memberCommunityIds: new Set(),
    requestedCommunityIds: new Set(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

suite("INTEREST_KEYWORDS map completeness", () => {
  const expectedInterests = [
    "Computer Science",
    "Artificial Intelligence",
    "Web Development",
    "Android Development",
    "Cyber Security",
    "Cloud Computing",
    "UI / UX",
    "Data Science",
  ];

  test("all onboarding interests have keyword entries", () => {
    for (const interest of expectedInterests) {
      assert.ok(
        INTEREST_KEYWORDS[interest] && INTEREST_KEYWORDS[interest].length > 0,
        `Missing keyword entry for interest: "${interest}"`
      );
    }
  });

  test("all keyword arrays contain only lowercase strings", () => {
    for (const [interest, keywords] of Object.entries(INTEREST_KEYWORDS)) {
      for (const kw of keywords) {
        assert.equal(kw, kw.toLowerCase(), `Keyword "${kw}" in "${interest}" is not lowercase`);
      }
    }
  });
});

suite("SKILL_KEYWORDS map completeness", () => {
  test("all keyword arrays are non-empty", () => {
    for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS)) {
      assert.ok(keywords.length > 0, `Empty keyword array for skill: "${skill}"`);
    }
  });
});

suite("scoreCommunity — interest signal", () => {
  test("returns 0 interest pts when user has no interests", () => {
    const c = makeCommunity({ name: "AI Builders", goal: "We build AI tools" });
    const s = makeSignals({ interests: [] });
    const result = scoreCommunity(c, s);
    assert.equal(result.interestPts, 0);
    assert.equal(result.topInterestMatch, null);
  });

  test("awards interest pts when community text matches", () => {
    const c = makeCommunity({ name: "AI Builders", goal: "We build AI tools using deep learning" });
    const s = makeSignals({ interests: ["Artificial Intelligence"] });
    const result = scoreCommunity(c, s);
    assert.ok(result.interestPts > 0, `Expected interest pts > 0, got ${result.interestPts}`);
    assert.equal(result.topInterestMatch, "Artificial Intelligence");
  });

  test("awards 0 interest pts when community text does not match interest", () => {
    const c = makeCommunity({ name: "Photography Club", goal: "Share your best photos" });
    const s = makeSignals({ interests: ["Artificial Intelligence"] });
    const result = scoreCommunity(c, s);
    assert.equal(result.interestPts, 0);
    assert.equal(result.topInterestMatch, null);
  });

  test("interest pts capped at 5 matches × 8", () => {
    // Give the community text that matches every interest
    const c = makeCommunity({
      name: "mega hub",
      goal: "computer science ai web android cyber cloud ui data",
      description: "machine learning deep learning neural fullstack frontend android docker design analytics",
    });
    const s = makeSignals({
      interests: [
        "Computer Science",
        "Artificial Intelligence",
        "Web Development",
        "Android Development",
        "Cyber Security",
        "Cloud Computing",
        "UI / UX",
        "Data Science",
      ],
    });
    const result = scoreCommunity(c, s);
    assert.ok(result.interestPts <= 40, `Interest pts ${result.interestPts} exceeds cap of 40`);
  });

  test("matches are case-insensitive (community text lowercased before match)", () => {
    const c = makeCommunity({ name: "WEB Dev Community", goal: "React and NEXT.JS" });
    const s = makeSignals({ interests: ["Web Development"] });
    const result = scoreCommunity(c, s);
    assert.ok(result.interestPts > 0, "Expected match for 'Web Development' in uppercased community name");
  });
});

suite("scoreCommunity — skill signal", () => {
  test("returns 0 skill pts when user has no skills", () => {
    const c = makeCommunity({ name: "Python devs", goal: "Python programming" });
    const s = makeSignals({ skills: [] });
    const result = scoreCommunity(c, s);
    assert.equal(result.skillPts, 0);
  });

  test("awards skill pts when community text contains skill keyword", () => {
    const c = makeCommunity({ name: "Python Coders", goal: "Learn Python together" });
    const s = makeSignals({ skills: ["Python"] });
    const result = scoreCommunity(c, s);
    assert.ok(result.skillPts > 0, `Expected skill pts > 0, got ${result.skillPts}`);
    assert.equal(result.topSkillMatch, "Python");
  });

  test("skill pts capped at 4 matches × 5", () => {
    const c = makeCommunity({
      name: "full stack",
      goal: "java python react node docker git",
    });
    const s = makeSignals({ skills: ["Java", "Python", "React", "Node.js", "Docker", "Git"] });
    const result = scoreCommunity(c, s);
    assert.ok(result.skillPts <= 20, `Skill pts ${result.skillPts} exceeds cap of 20`);
  });
});

suite("scoreCommunity — capacity signal", () => {
  test("awards full capacity pts when community is empty", () => {
    const c = makeCommunity({ max_members: 10, member_count: 0 });
    const s = makeSignals();
    const { capacityPts } = scoreCommunity(c, s);
    assert.equal(capacityPts, 10);
  });

  test("awards 0 capacity pts when community is exactly full", () => {
    const c = makeCommunity({ max_members: 10, member_count: 10 });
    const s = makeSignals();
    const { capacityPts } = scoreCommunity(c, s);
    assert.equal(capacityPts, 0);
  });

  test("awards proportional capacity pts (50% full → ~5 pts)", () => {
    const c = makeCommunity({ max_members: 10, member_count: 5 });
    const s = makeSignals();
    const { capacityPts } = scoreCommunity(c, s);
    assert.ok(capacityPts >= 4 && capacityPts <= 6, `Expected ~5, got ${capacityPts}`);
  });
});

suite("scoreCommunity — recency signal", () => {
  test("awards 10 pts for community created within 30 days", () => {
    const c = makeCommunity({ created_at: recentDate });
    const { recencyPts } = scoreCommunity(c, makeSignals());
    assert.equal(recencyPts, 10);
  });

  test("awards 0 pts for community older than 90 days", () => {
    const c = makeCommunity({ created_at: oldDate });
    const { recencyPts } = scoreCommunity(c, makeSignals());
    assert.equal(recencyPts, 0);
  });
});

suite("scoreCommunity — popularity signal", () => {
  test("awards 10 pts when member_count >= 10", () => {
    const c = makeCommunity({ member_count: 15 });
    const { popularityPts } = scoreCommunity(c, makeSignals());
    assert.equal(popularityPts, 10);
  });

  test("awards 5 pts when member_count is 5–9", () => {
    const c = makeCommunity({ member_count: 7 });
    const { popularityPts } = scoreCommunity(c, makeSignals());
    assert.equal(popularityPts, 5);
  });

  test("awards 2 pts when member_count < 5", () => {
    const c = makeCommunity({ member_count: 2 });
    const { popularityPts } = scoreCommunity(c, makeSignals());
    assert.equal(popularityPts, 2);
  });
});

suite("deriveReason — reason prioritisation", () => {
  test("interest reason wins over all others", () => {
    const c = makeCommunity({ member_count: 20, created_at: recentDate });
    // Force a synthetic breakdown with both interest and popularity
    const breakdown = {
      interestPts: 8,
      skillPts: 5,
      capacityPts: 10,
      recencyPts: 10,
      popularityPts: 10,
      total: 43,
      topInterestMatch: "Artificial Intelligence",
      topSkillMatch: "Python",
    };
    const { reasonCode, reasonLabel } = deriveReason(breakdown, c);
    assert.equal(reasonCode, "interest");
    assert.ok(reasonLabel.includes("Artificial Intelligence"));
  });

  test("skill reason when no interest match", () => {
    const c = makeCommunity();
    const breakdown = {
      interestPts: 0,
      skillPts: 5,
      capacityPts: 5,
      recencyPts: 0,
      popularityPts: 5,
      total: 15,
      topInterestMatch: null,
      topSkillMatch: "Python",
    };
    const { reasonCode, reasonLabel } = deriveReason(breakdown, c);
    assert.equal(reasonCode, "skill");
    assert.ok(reasonLabel.includes("Python"));
  });

  test("'none' reason when no signal fired", () => {
    const c = makeCommunity({ member_count: 2, created_at: oldDate });
    const breakdown = {
      interestPts: 0,
      skillPts: 0,
      capacityPts: 8,
      recencyPts: 0,
      popularityPts: 2,
      total: 10,
      topInterestMatch: null,
      topSkillMatch: null,
    };
    const { reasonCode, reasonLabel } = deriveReason(breakdown, c);
    assert.equal(reasonCode, "none");
    assert.equal(reasonLabel, "");
  });

  test("'available' reason when recent + has capacity and no keyword matches", () => {
    const c = makeCommunity({ member_count: 3, max_members: 20, created_at: recentDate });
    const breakdown = {
      interestPts: 0,
      skillPts: 0,
      capacityPts: 9,
      recencyPts: 10,
      popularityPts: 2,
      total: 21,
      topInterestMatch: null,
      topSkillMatch: null,
    };
    const { reasonCode } = deriveReason(breakdown, c);
    assert.equal(reasonCode, "available");
  });

  test("'popular' reason when member_count high and no keyword/recency match", () => {
    const c = makeCommunity({ member_count: 15, created_at: oldDate });
    const breakdown = {
      interestPts: 0,
      skillPts: 0,
      capacityPts: 3,
      recencyPts: 0,
      popularityPts: 10,
      total: 13,
      topInterestMatch: null,
      topSkillMatch: null,
    };
    const { reasonCode } = deriveReason(breakdown, c);
    assert.equal(reasonCode, "popular");
  });
});

suite("rankCommunities — filtering", () => {
  const base: CommunityWithCount[] = [
    makeCommunity({ id: "c1", name: "Alpha" }),
    makeCommunity({ id: "c2", name: "Beta" }),
    makeCommunity({ id: "c3", name: "Gamma" }),
  ];

  test("excludes communities the user is already a member of", () => {
    const s = makeSignals({ memberCommunityIds: new Set(["c1"]) });
    const results = rankCommunities(base, s, 10);
    assert.ok(!results.find((r) => r.id === "c1"), "c1 should be excluded (already member)");
    assert.equal(results.length, 2);
  });

  test("excludes communities with pending join requests", () => {
    const s = makeSignals({ requestedCommunityIds: new Set(["c2"]) });
    const results = rankCommunities(base, s, 10);
    assert.ok(!results.find((r) => r.id === "c2"), "c2 should be excluded (pending request)");
  });

  test("excludes duplicates in candidate list", () => {
    const duped = [...base, makeCommunity({ id: "c1", name: "Alpha" })];
    const s = makeSignals();
    const results = rankCommunities(duped, s, 10);
    const c1Count = results.filter((r) => r.id === "c1").length;
    assert.equal(c1Count, 1, "Duplicate c1 should appear only once");
  });

  test("respects limit parameter", () => {
    const s = makeSignals();
    const results = rankCommunities(base, s, 2);
    assert.equal(results.length, 2);
  });

  test("returns empty array when all candidates are filtered out", () => {
    const s = makeSignals({
      memberCommunityIds: new Set(["c1", "c2", "c3"]),
    });
    const results = rankCommunities(base, s, 10);
    assert.equal(results.length, 0);
  });
});

suite("rankCommunities — scoring order", () => {
  test("higher-scoring community appears first", () => {
    const highMatch: CommunityWithCount = makeCommunity({
      id: "high",
      name: "AI Machine Learning Hub",
      goal: "deep learning neural networks artificial intelligence",
      member_count: 15,
      created_at: recentDate,
    });
    const lowMatch: CommunityWithCount = makeCommunity({
      id: "low",
      name: "General Hangout",
      goal: "Just chilling",
      member_count: 2,
      created_at: oldDate,
    });
    const s = makeSignals({ interests: ["Artificial Intelligence"] });
    const results = rankCommunities([lowMatch, highMatch], s, 5);
    assert.equal(results[0].id, "high", "High-match community should rank first");
  });

  test("tie-breaking is stable (alphabetical by name)", () => {
    const a: CommunityWithCount = makeCommunity({ id: "a", name: "Zeta Club", created_at: now, member_count: 5 });
    const b: CommunityWithCount = makeCommunity({ id: "b", name: "Alpha Club", created_at: now, member_count: 5 });
    const s = makeSignals();
    const results = rankCommunities([a, b], s, 5);
    assert.equal(results[0].name, "Alpha Club", "Alphabetically earlier name should appear first on tie");
  });
});

suite("rankCommunities — full community handling", () => {
  test("full community is still included in results (just lower score)", () => {
    const full: CommunityWithCount = makeCommunity({
      id: "full",
      name: "AI Builders",
      goal: "artificial intelligence deep learning",
      max_members: 10,
      member_count: 10, // full
      created_at: recentDate,
    });
    const s = makeSignals({ interests: ["Artificial Intelligence"] });
    const results = rankCommunities([full], s, 5);
    // Full community still shows (user may want to view it), just capacity pts = 0
    assert.equal(results.length, 1);
    assert.equal(results[0].id, "full");
  });
});

suite("rankCommunities — user with no signals", () => {
  test("still returns results sorted by recency+popularity when no interests/skills", () => {
    const communities: CommunityWithCount[] = [
      makeCommunity({ id: "old", name: "Old Community", created_at: oldDate, member_count: 1 }),
      makeCommunity({ id: "new", name: "New Community", created_at: recentDate, member_count: 12 }),
    ];
    const s = makeSignals({ interests: [], skills: [] });
    const results = rankCommunities(communities, s, 5);
    // new community should score higher (recency=10 + popularity=10 > old community)
    assert.equal(results[0].id, "new");
  });
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("\nSome tests failed — see errors above.");
  process.exit(1);
} else {
  console.log("\nAll tests passed ✓");
}

// ── [LIVE] Manual Supabase integration tests ──────────────────────────────────
//
// The following scenarios CANNOT be automated without a configured Supabase
// instance. They are documented here as manual test steps:
//
// [LIVE-1] User with interests = ["Artificial Intelligence", "Web Development"]
//   - Expected: communities whose goal/name contains "ai", "machine learning",
//     "web", "react", etc. appear with reason "Matches your interest in X"
//
// [LIVE-2] User with interests = [] (skipped onboarding interest step)
//   - Expected: recommendations appear sorted by recency/popularity,
//     empty-state copy says "Complete your profile interests..."
//
// [LIVE-3] User who is already a member of community X
//   - Expected: community X does not appear in recommendations
//
// [LIVE-4] User with a pending join request on community Y
//   - Expected: community Y does not appear in recommendations
//
// [LIVE-5] User who is a member of ALL available communities
//   - Expected: empty state shown with "You've already joined all available communities"
//
// [LIVE-6] Database with zero communities
//   - Expected: empty state shown gracefully, no crash
//
// [LIVE-7] Two users with different interests (User A: AI; User B: Cloud Computing)
//   - Expected: User A sees AI communities first; User B sees Cloud communities first
//
// [LIVE-8] Supabase unreachable / network failure
//   - Expected: error state shown in UI, "Unable to load recommendations. Try refreshing."
//
// [LIVE-9] Mobile viewport (< 768px)
//   - Expected: aside collapses; recommendations section hidden on mobile
//     (xl:block on parent aside in DashboardPage — consistent with original behaviour)
