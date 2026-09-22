import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearRecovery,
  parseRecovery,
  requestRecovery,
  updateRecoveredPassword,
  recoveryRedirect,
} from "./recovery";
afterEach(() => {
  vi.unstubAllGlobals();
  clearRecovery();
});
describe("password recovery", () => {
  it("only accepts recovery links, rejecting other auth flows and errors", () => {
    expect(parseRecovery("#access_token=test&type=recovery")).toBe("test");
    expect(parseRecovery("#access_token=test&type=signup")).toBe("");
    expect(
      parseRecovery("#access_token=test&type=recovery&error=expired"),
    ).toBe("");
    expect(parseRecovery("#room=ABCD1234")).toBe("");
  });
  it("uses only the configured production callback for recovery emails", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetcher);
    await requestRecovery(" admin@example.com ");
    expect(fetcher.mock.calls[0]![0]).toContain(
      encodeURIComponent(recoveryRedirect),
    );
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({
      email: "admin@example.com",
    });
  });
  it("rejects missing recovery sessions without sending a password", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(updateRecoveredPassword("test-only-password")).rejects.toThrow(
      "expired",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("reports a rate limit instead of falsely reporting mail delivery", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429 }),
    );
    await expect(requestRecovery("admin@example.com")).rejects.toThrow(
      "rate-limit",
    );
  });
});

it("scrubs recovery credentials and checks admin permission before updating", async () => {
  vi.resetModules();
  vi.stubGlobal("location", {
    search: "?recovery=1",
    hash: "#type=recovery&access_token=mock-test-token",
    pathname: "/choices-games/",
  });
  const replaceState = vi.fn();
  vi.stubGlobal("history", { replaceState });
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, text: async () => "true" })
    .mockResolvedValueOnce({ ok: true, text: async () => "{}" })
    .mockResolvedValueOnce({ ok: true, text: async () => "" });
  vi.stubGlobal("fetch", fetcher);
  const recovery = await import("./recovery");
  expect(replaceState).toHaveBeenCalledWith(
    null,
    "",
    "/choices-games/?recovery=1",
  );
  await recovery.updateRecoveredPassword("test-only-new-password");
  expect(fetcher.mock.calls[0]![0]).toContain("is_dilemma_admin");
  expect(fetcher.mock.calls[1]![1].method).toBe("PUT");
  expect(fetcher.mock.calls[1]![1].headers.Authorization).toBe(
    "Bearer mock-test-token",
  );
  expect(recovery.hasRecoveryAccess()).toBe(false);
});
it("never changes a password when admin authorization is denied", async () => {
  vi.resetModules();
  vi.stubGlobal("location", {
    search: "?recovery=1",
    hash: "#type=recovery&access_token=mock-test-token",
    pathname: "/choices-games/",
  });
  vi.stubGlobal("history", { replaceState: vi.fn() });
  const fetcher = vi
    .fn()
    .mockResolvedValue({ ok: true, text: async () => "false" });
  vi.stubGlobal("fetch", fetcher);
  const recovery = await import("./recovery");
  await expect(
    recovery.updateRecoveredPassword("test-only-password"),
  ).rejects.toThrow("expired");
  expect(fetcher).toHaveBeenCalledTimes(1);
  recovery.clearRecovery();
});

it("leaves player recovery links for the player auth client", async () => {
  vi.resetModules();
  vi.stubGlobal("location", {
    search: "?account=1&player-recovery=1",
    hash: "#type=recovery&access_token=player-test-token",
    pathname: "/choices-games/",
  });
  const replaceState = vi.fn();
  vi.stubGlobal("history", { replaceState });
  const recovery = await import("./recovery");
  expect(recovery.recoveryLanding).toBe(false);
  expect(recovery.hasRecoveryAccess()).toBe(false);
  expect(replaceState).not.toHaveBeenCalled();
});
