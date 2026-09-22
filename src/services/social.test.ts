// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
vi.mock("./supabase", () => ({ playerAuth: {} }));
import { accountRedirect, invitationToken } from "./social";
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
