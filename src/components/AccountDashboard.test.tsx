// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  AccountDashboard,
  type AccountNavigationProps,
} from "./AccountDashboard";
import type { CloudResult } from "../services/player-cloud";
import { dailyQuestion } from "../services/account-view";

const api = vi.hoisted(() => ({
  list: vi.fn(),
  proposals: vi.fn(),
  updateProposal: vi.fn(),
  deleteResult: vi.fn(),
  clearHistory: vi.fn(),
  deleteAccount: vi.fn(),
  nickname: vi.fn(),
  email: vi.fn(),
  selectAvatar: vi.fn(),
  uploadPhoto: vi.fn(),
  photoUrl: vi.fn(),
  signOut: vi.fn(),
  vote: vi.fn(),
  daily: vi.fn(),
  admin: vi.fn(),
}));
vi.mock("../services/player-cloud", async (original) => ({
  ...(await original<typeof import("../services/player-cloud")>()),
  listCloudResults: api.list,
}));
vi.mock("../services/player-features", () => ({
  deleteResult: api.deleteResult,
  clearPlayerHistory: api.clearHistory,
  deletePlayerAccount: api.deleteAccount,
  updateNickname: api.nickname,
  updateEmail: api.email,
  profileAvatarIds: [
    "builder",
    "compass",
    "free",
    "guardian",
    "mediator",
    "present",
    "scout",
    "sensitive",
    "strategist",
    "visionary",
  ],
  isProfileAvatarId: (value: unknown) =>
    typeof value === "string" &&
    [
      "builder",
      "compass",
      "free",
      "guardian",
      "mediator",
      "present",
      "scout",
      "sensitive",
      "strategist",
      "visionary",
    ].includes(value),
  selectProfileAvatar: api.selectAvatar,
  uploadProfilePhoto: api.uploadPhoto,
  profilePhotoUrl: api.photoUrl,
  exportPlayerData: vi.fn(),
  listDuos: vi.fn().mockResolvedValue([]),
  listMyDilemmaProposals: api.proposals,
  updateMyDilemmaProposal: api.updateProposal,
  dailyState: api.daily,
  isDilemmaAdmin: api.admin,
  listCircles: vi.fn().mockResolvedValue([]),
  circleHistory: vi.fn(),
  createCircle: vi.fn(),
  joinCircle: vi.fn(),
  answerDuel: vi.fn(),
  createDuel: vi.fn(),
  readDuel: vi.fn(),
}));
vi.mock("../services/supabase", () => ({
  playerAuth: { auth: { signOut: api.signOut } },
}));
vi.mock("../services/public-votes", () => ({ publicVote: api.vote }));

const user = {
  id: "test-player",
  email: "player@example.test",
  user_metadata: { display_name: "Jean-Charles" },
  app_metadata: {},
  aud: "authenticated",
  created_at: "2026-09-01T00:00:00Z",
} as User;
const results: CloudResult[] = [
  {
    id: "one",
    archetypeId: "scout",
    length: 25,
    completedAt: "2026-09-21T09:00:00Z",
    vector: {
      adventure: 76,
      reason: 12,
      independence: 24,
      future: 20,
      structure: -30,
      ambition: 18,
    },
  },
  {
    id: "two",
    archetypeId: "guardian",
    length: 10,
    completedAt: "2026-09-18T09:00:00Z",
    vector: {
      adventure: 94,
      reason: 12,
      independence: 24,
      future: 20,
      structure: -30,
      ambition: 18,
    },
  },
  {
    id: "three",
    archetypeId: "strategist",
    length: 15,
    completedAt: "2026-09-15T09:00:00Z",
    vector: {
      adventure: 0,
      reason: 50,
      independence: 24,
      future: 50,
      structure: 60,
      ambition: 18,
    },
  },
];
let props: AccountNavigationProps;
function capture(name: string) {
  if (!process.env.ACCOUNT_CAPTURE) return;
  mkdirSync("work/account-qa", { recursive: true });
  writeFileSync(
    `work/account-qa/${name}.html`,
    `<!doctype html><html lang="fr"><head><base href="/"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Account QA — ${name}</title><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/styles/brand.css"><link rel="stylesheet" href="/src/styles/animated-logo.css"><link rel="stylesheet" href="/src/styles/account.css"></head><body><div class="app-shell"><main>${document.body.innerHTML}</main></div></body></html>`,
  );
}
async function mount() {
  render(<AccountDashboard user={user} {...props} />);
  await screen.findByRole("button", { name: "Ouvrir le portrait L’Éclaireur" });
}
function navigate(name: string) {
  fireEvent.click(screen.getAllByRole("button", { name })[0]!);
}
beforeEach(() => {
  vi.clearAllMocks();
  window.scrollTo = vi.fn();
  localStorage.clear();
  api.list.mockReset().mockResolvedValue(results);
  api.proposals.mockReset().mockResolvedValue([]);
  api.updateProposal.mockReset().mockResolvedValue(undefined);
  api.deleteResult.mockReset().mockResolvedValue(undefined);
  api.clearHistory.mockReset().mockResolvedValue(undefined);
  api.deleteAccount.mockReset().mockResolvedValue(undefined);
  api.nickname.mockReset().mockResolvedValue(undefined);
  api.email.mockReset().mockResolvedValue(undefined);
  api.selectAvatar.mockReset().mockResolvedValue(undefined);
  api.uploadPhoto.mockReset().mockResolvedValue("blob:profile-photo");
  api.photoUrl.mockReset().mockResolvedValue("blob:stored-photo");
  api.signOut.mockReset().mockResolvedValue({ error: null });
  api.vote.mockReset().mockResolvedValue({ mine: null, a: 0, b: 0 });
  api.daily.mockReset().mockResolvedValue({ mine: null, a: 0, b: 0 });
  api.admin.mockReset().mockResolvedValue(false);
  // jsdom has no top-layer layout; retain native open/close semantics for interaction tests.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  props = {
    locale: "fr",
    dark: false,
    onThemeChange: vi.fn(),
    onLocaleChange: vi.fn(),
    onBack: vi.fn(),
    onPlay: vi.fn(),
    circles: [],
    onCirclesChanged: vi.fn(),
  };
});
afterEach(cleanup);
describe("account space with real service boundaries", () => {
  it("only exposes administration after the server authorizes the account", async () => {
    const onAdmin = vi.fn();
    props.onAdmin = onAdmin;
    await mount();
    expect(screen.queryByRole("button", { name: "Administration" })).toBeNull();
    cleanup();
    api.admin.mockResolvedValue(true);
    render(<AccountDashboard user={user} {...props} />);
    const button = await screen.findByRole("button", {
      name: "Administration",
    });
    fireEvent.click(button);
    expect(onAdmin).toHaveBeenCalledOnce();
  });
  it("notifies the player when today's dilemma has not been answered", async () => {
    await mount();
    await waitFor(() => expect(api.daily).toHaveBeenCalled());
    const notifications = screen.getByRole("button", { name: "Notifications" });
    expect(notifications.querySelector("b")?.textContent).toBe("1");
    fireEvent.click(notifications);
    fireEvent.click(
      screen.getByRole("button", { name: /Dilemme du jour en attente/ }),
    );
    await waitFor(() => expect(api.vote).toHaveBeenCalled());
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      dailyQuestion(new Date().toISOString().slice(0, 10)).prompt.fr,
    );
  });
  it("shows the signed-in player's dilemma suggestions and moderation status", async () => {
    api.proposals.mockResolvedValueOnce([
      {
        id: "proposal-one",
        locale: "fr",
        prompt:
          "Choisir entre dire une vérité difficile ou préserver une relation fragile.",
        optionA: "Dire toute la vérité immédiatement",
        optionB: "Garder le silence pour protéger la relation",
        status: "pending",
        createdAt: "2026-09-23T09:00:00Z",
        reviewedAt: null,
      },
    ]);
    await mount();
    navigate("Mes propositions");
    expect(screen.getByText("En modération")).toBeTruthy();
    expect(screen.getByText("Dire toute la vérité immédiatement")).toBeTruthy();
    expect(
      screen.getByText("Garder le silence pour protéger la relation"),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    fireEvent.change(screen.getByLabelText("Situation"), {
      target: {
        value:
          "Choisir entre dire toute la vérité maintenant ou attendre le bon moment.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await screen.findByText("Proposition mise à jour.");
    expect(api.updateProposal).toHaveBeenCalledWith(
      "proposal-one",
      "Choisir entre dire toute la vérité maintenant ou attendre le bon moment.",
      "Dire toute la vérité immédiatement",
      "Garder le silence pour protéger la relation",
    );
  });
  it("keeps mobile navigation in sync with the current page and brings its content into view", async () => {
    await mount();
    const navigation = screen.getByRole("navigation", {
      name: "Navigation mobile",
    });
    const portraitsButton = within(navigation).getByRole("button", {
      name: "Mes portraits",
    });
    fireEvent.click(portraitsButton);
    expect(portraitsButton.getAttribute("aria-current")).toBe("page");
    expect(
      within(navigation)
        .getByRole("button", { name: "Vue d’ensemble" })
        .getAttribute("aria-current"),
    ).toBeNull();
    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 0,
      behavior: "instant",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Ouvrir le portrait L’Éclaireur" }),
    );
    expect(portraitsButton.getAttribute("aria-current")).toBe("page");
    fireEvent.click(
      within(navigation).getByRole("button", { name: "Dilemme du jour" }),
    );
    await waitFor(() => expect(api.vote).toHaveBeenCalled());
    expect(
      within(navigation)
        .getByRole("button", { name: "Dilemme du jour" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(portraitsButton.getAttribute("aria-current")).toBeNull();
  });
  it("opens the stored portrait with all six original scores and uses the negative evolution pole", async () => {
    await mount();
    capture("home");
    fireEvent.click(
      screen.getByRole("button", { name: "Ouvrir le portrait L’Éclaireur" }),
    );
    expect(screen.getAllByRole("meter")).toHaveLength(6);
    expect(screen.getAllByRole("meter")[0]!.getAttribute("aria-valuenow")).toBe(
      "76",
    );
    capture("detail");
    navigate("Mes portraits");
    expect(screen.getByText("Vers plus de sécurité.")).toBeTruthy();
    expect(screen.getByText("18")).toBeTruthy();
    capture("portraits");
  });
  it("distinguishes an unavailable history from an empty one and retries", async () => {
    api.list
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([]);
    render(<AccountDashboard user={user} {...props} />);
    await screen.findByRole("alert");
    expect(screen.queryByText("Ton histoire commence ici.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    await screen.findByText("Ton histoire commence ici.");
    fireEvent.click(
      screen.getByRole("button", { name: "Jouer ma première partie ↗" }),
    );
    expect(props.onPlay).toHaveBeenCalledOnce();
  });
  it("requires confirmation and preserves the portrait when its deletion fails", async () => {
    api.deleteResult.mockRejectedValueOnce(new Error("offline"));
    await mount();
    navigate("Mes portraits");
    fireEvent.click(
      screen.getByRole("button", { name: /Supprimer le portrait L’Éclaireur/ }),
    );
    expect(api.deleteResult).not.toHaveBeenCalled();
    const modal = screen.getByRole("dialog");
    capture("confirmation");
    fireEvent.click(within(modal).getByRole("button", { name: "Supprimer" }));
    await within(modal).findByRole("alert");
    expect(
      screen.getByRole("button", { name: "Ouvrir le portrait L’Éclaireur" }),
    ).toBeTruthy();
    fireEvent.click(within(modal).getByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      screen.queryByRole("button", { name: "Ouvrir le portrait L’Éclaireur" }),
    ).toBeNull();
    expect(api.deleteResult).toHaveBeenLastCalledWith("one");
  });
  it("does not submit account deletion until the exact confirmation is entered", async () => {
    await mount();
    navigate("Confidentialité");
    fireEvent.click(
      screen.getByRole("button", { name: "Supprimer le compte" }),
    );
    const modal = screen.getByRole("dialog");
    const button = within(modal).getByRole("button", {
      name: "Supprimer",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(
      within(modal).getByLabelText("Écris SUPPRIMER pour confirmer"),
      { target: { value: "supprimer" } },
    );
    expect(button.disabled).toBe(true);
    expect(api.deleteAccount).not.toHaveBeenCalled();
    fireEvent.change(
      within(modal).getByLabelText("Écris SUPPRIMER pour confirmer"),
      { target: { value: "SUPPRIMER" } },
    );
    fireEvent.click(button);
    await waitFor(() => expect(api.deleteAccount).toHaveBeenCalledOnce());
  });
  it("clears history only after confirmation and blocks duplicate pending submissions", async () => {
    let finish!: () => void;
    api.clearHistory.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    await mount();
    navigate("Confidentialité");
    fireEvent.click(
      screen.getByRole("button", { name: "Effacer l’historique" }),
    );
    const modal = screen.getByRole("dialog");
    const button = within(modal).getByRole("button", { name: "Supprimer" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(api.clearHistory).toHaveBeenCalledOnce();
    expect(
      (
        within(modal).getByRole("button", {
          name: "Annuler",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    finish();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    navigate("Mes portraits");
    expect(screen.getByText("Ton histoire commence ici.")).toBeTruthy();
  });
  it("updates nickname separately from the verified email flow", async () => {
    await mount();
    navigate("Mon compte");
    capture("account");
    fireEvent.change(screen.getByLabelText(/Pseudo/), {
      target: { value: "  Alex  " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer mon pseudo" }),
    );
    await screen.findByText("Pseudo mis à jour.");
    expect(api.nickname).toHaveBeenCalledWith("Alex");
    expect(api.email).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Adresse e-mail/), {
      target: { value: "alex@example.test" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Modifier mon adresse" }),
    );
    await screen.findByText(/Vérifie les e-mails de confirmation/);
    expect(api.email).toHaveBeenCalledWith("alex@example.test");
  });
  it("selects a bundled avatar or uploads a private profile photo", async () => {
    await mount();
    navigate("Mon compte");
    fireEvent.click(screen.getByRole("button", { name: "Le Gardien" }));
    await screen.findByText("Avatar mis à jour.");
    expect(api.selectAvatar).toHaveBeenCalledWith("guardian", null);

    const photo = new File(["photo"], "portrait.webp", {
      type: "image/webp",
    });
    fireEvent.change(screen.getByLabelText("Importer une photo"), {
      target: { files: [photo] },
    });
    await screen.findByText("Photo mise à jour.");
    expect(api.uploadPhoto).toHaveBeenCalledWith(photo, "test-player");
  });
  it("surfaces profile errors without a success message", async () => {
    api.nickname.mockRejectedValueOnce(new Error("offline"));
    await mount();
    navigate("Mon compte");
    fireEvent.change(screen.getByLabelText(/Pseudo/), {
      target: { value: "Alex" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer mon pseudo" }),
    );
    await screen.findByRole("alert");
    expect(screen.queryByText("Pseudo mis à jour.")).toBeNull();
  });
  it("uses the same daily question in the overview and the actual voting screen", async () => {
    await mount();
    const daily = dailyQuestion(new Date().toISOString().slice(0, 10));
    expect(screen.getByText(daily.prompt.fr)).toBeTruthy();
    navigate("Dilemme du jour");
    await waitFor(() => expect(api.vote).toHaveBeenCalledWith(daily.id));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      daily.prompt.fr,
    );
    capture("daily");
  });
  it("shares theme and language with the app and persists the animation preference", async () => {
    await mount();
    navigate("Préférences");
    fireEvent.change(screen.getByLabelText("Thème"), {
      target: { value: "dark" },
    });
    expect(props.onThemeChange).toHaveBeenCalledWith(true);
    fireEvent.change(screen.getByLabelText("Langue de l’interface"), {
      target: { value: "en" },
    });
    expect(props.onLocaleChange).toHaveBeenCalledWith("en");
    fireEvent.change(screen.getByLabelText("Animations"), {
      target: { value: "off" },
    });
    expect(localStorage.getItem("dilemma.account.motion")).toBe("off");
    expect(document.getElementById("player-space")!.dataset.motion).toBe("off");
  });
  it("resumes the current game through the application callback", async () => {
    props.onResume = vi.fn();
    await mount();
    fireEvent.click(
      screen.getByRole("button", { name: "Reprendre ma partie ↗" }),
    );
    expect(props.onResume).toHaveBeenCalledOnce();
    expect(props.onPlay).not.toHaveBeenCalled();
  });
  it("opens the main experience from Entre vous", async () => {
    await mount();
    fireEvent.click(screen.getByRole("button", { name: /Entre vous/ }));
    expect(props.onPlay).toHaveBeenCalledOnce();

    cleanup();
    props.onResume = vi.fn();
    render(<AccountDashboard user={user} {...props} />);
    await screen.findByRole("button", { name: /Entre vous/ });
    fireEvent.click(screen.getByRole("button", { name: /Entre vous/ }));
    expect(
      screen.getByRole("heading", { name: "Comment voulez-vous jouer ?" }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /Reprendre la partie/ }),
    );
    expect(props.onResume).toHaveBeenCalledOnce();
    expect(props.onPlay).toHaveBeenCalledOnce();
  });
  it("can start a new game from the Entre vous choice", async () => {
    props.onResume = vi.fn();
    await mount();
    fireEvent.click(screen.getByRole("button", { name: /Entre vous/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Créer une nouvelle partie" }),
    );
    expect(props.onPlay).toHaveBeenCalledOnce();
    expect(props.onResume).not.toHaveBeenCalled();
  });
  it("provides English copy and English account deletion confirmation", async () => {
    props.locale = "en";
    render(<AccountDashboard user={user} {...props} />);
    await screen.findByRole("button", { name: "Open portrait The Pathfinder" });
    navigate("Privacy");
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    expect(screen.getByLabelText("Type DELETE to confirm")).toBeTruthy();
  });
});
