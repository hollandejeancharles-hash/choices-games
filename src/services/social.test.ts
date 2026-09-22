// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
vi.mock("./supabase", () => ({ playerAuth: {} }));
import {
  accountRedirect,
  invitationToken,
  playerRecoveryRedirect,
  playerRecoveryRequested,
} from "./social";
afterEach(() => history.replaceState(null, "", "/"));
it("conserve l’invitation lors de l’inscription et de la récupération", () => {
  const token = "12345678-1234-1234-1234-123456789abc";
  history.replaceState(null, "", "/?account=1&invite=" + token);
  expect(invitationToken()).toBe(token);
  expect(accountRedirect()).toContain("?account=1&invite=" + token);
});
it("ignore les jetons malformés", () => {
  history.replaceState(null, "", "/?invite=bad");
  expect(invitationToken()).toBeNull();
});

it("distingue la récupération joueur des autres retours de compte", () => {
  history.replaceState(null, "", "/?account=1&recovery=1");
  expect(playerRecoveryRequested()).toBe(true);
  expect(playerRecoveryRedirect()).toBe(
    `${location.origin}/?account=1&recovery=1`,
  );
});
