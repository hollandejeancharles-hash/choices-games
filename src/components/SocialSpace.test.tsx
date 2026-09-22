// @vitest-environment jsdom
import { mkdirSync, writeFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { SocialSpace } from "./SocialSpace";
import {
  createInvitation,
  previewInvitation,
  respondInvitation,
  sendInvitationEmail,
  socialState,
} from "../services/social";
vi.mock("../services/social", async (original) => ({
  ...(await original<typeof import("../services/social")>()),
  createInvitation: vi.fn(),
  previewInvitation: vi.fn(),
  respondInvitation: vi.fn(),
  sendInvitationEmail: vi.fn(),
  socialState: vi.fn(),
  cancelInvitation: vi.fn(),
  removeFriend: vi.fn(),
}));
vi.mock("./PrivateCircles", () => ({
  PrivateCircles: () => <div>Cercles privés</div>,
}));
afterEach(() => {
  cleanup();
  history.replaceState(null, "", "/");
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(socialState).mockResolvedValue({ friends: [], invitations: [] });
});
it("crée une invitation d’ami et ne prétend pas envoyer un e-mail en cas d’échec", async () => {
  vi.mocked(createInvitation).mockResolvedValue({
    id: "invite-id",
    token: "12345678-1234-1234-1234-123456789abc",
  });
  vi.mocked(sendInvitationEmail).mockRejectedValue(new Error("not configured"));
  render(<SocialSpace locale="fr" onBack={vi.fn()} />);
  fireEvent.click(screen.getByRole("tab", { name: "Amis" }));
  fireEvent.click(screen.getByRole("button", { name: "Inviter un ami" }));
  fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
    target: { value: "friend@example.test" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Envoyer l’invitation" }));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    expect.stringContaining("n’a pas été envoyé"),
  );
  expect(createInvitation).toHaveBeenCalledWith(
    "friend",
    null,
    "friend@example.test",
    expect.any(String),
  );
  expect(screen.getByLabelText("Lien d’invitation")).toHaveProperty(
    "value",
    expect.stringContaining("?account=1&invite="),
  );
});
it("ne crée pas de relation à l’ouverture du lien, attend l’acceptation", async () => {
  const token = "12345678-1234-1234-1234-123456789abc";
  history.replaceState(null, "", "/?account=1&invite=" + token);
  vi.mocked(previewInvitation).mockResolvedValue({
    token,
    kind: "friend",
    outgoing: false,
    senderName: "Camille",
    circleName: null,
  });
  vi.mocked(respondInvitation).mockResolvedValue(undefined);
  render(<SocialSpace locale="fr" onBack={vi.fn()} />);
  await screen.findByText("Devenir ami avec Camille");
  expect(respondInvitation).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Accepter" }));
  await waitFor(() =>
    expect(respondInvitation).toHaveBeenCalledWith(token, true),
  );
  await screen.findByText("Invitation acceptée.");
  expect(location.search).not.toContain("invite=");
});
it("crée un lien sans envoyer d’e-mail et expose les onglets au clavier", async () => {
  vi.mocked(createInvitation).mockResolvedValue({
    id: "invite-id",
    token: "12345678-1234-1234-1234-123456789abc",
  });
  render(<SocialSpace locale="fr" onBack={vi.fn()} />);
  fireEvent.keyDown(screen.getByRole("tab", { name: "Cercles" }), {
    key: "ArrowRight",
  });
  fireEvent.click(screen.getByRole("button", { name: "Inviter un ami" }));
  fireEvent.click(screen.getByRole("button", { name: "Par lien" }));
  fireEvent.click(screen.getByRole("button", { name: "Créer le lien" }));
  await screen.findByLabelText("Lien d’invitation");
  expect(sendInvitationEmail).not.toHaveBeenCalled();
  expect(createInvitation).toHaveBeenCalledWith(
    "friend",
    null,
    null,
    expect.any(String),
  );
});

it("capture facultative de la composition mobile", async () => {
  if (!process.env.SOCIAL_CAPTURE) return;
  vi.mocked(socialState).mockResolvedValue({
    friends: [{ id: "friend", name: "Camille" }],
    invitations: [
      {
        id: "one",
        token: "12345678-1234-1234-1234-123456789abc",
        kind: "circle",
        circleName: "Les proches",
        senderName: "Jean",
        email: "camille@example.test",
        outgoing: true,
        status: "pending",
        delivery: "unsent",
        createdAt: new Date().toISOString(),
      },
    ],
  });
  const view = render(
    <main id="player-space">
      <div className="c-main">
        <div className="c-content">
          <div className="c-activity-page">
            <SocialSpace locale="fr" onBack={vi.fn()} onDuo={vi.fn()} />
          </div>
        </div>
      </div>
    </main>,
  );
  fireEvent.click(screen.getByRole("tab", { name: "Amis" }));
  await screen.findByText("Camille");
  fireEvent.click(screen.getByRole("button", { name: "Inviter un ami" }));
  mkdirSync("work/social-qa", { recursive: true });
  writeFileSync(
    "work/social-qa/index.html",
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/styles/account.css">' +
      view.container.innerHTML,
  );
});
