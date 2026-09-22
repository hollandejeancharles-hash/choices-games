// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AsyncDuel } from "./AsyncDuel";
import {
  listDuos,
  createDuel,
  createDuelInvitation,
  readDuel,
  sendDuelInvitationEmail,
} from "../services/player-features";
import { socialState } from "../services/social";
vi.mock("../services/player-features", () => ({
  listDuos: vi.fn(),
  createDuel: vi.fn(),
  readDuel: vi.fn(),
  answerDuel: vi.fn(),
  createDuelInvitation: vi.fn(),
  sendDuelInvitationEmail: vi.fn(),
}));
vi.mock("../services/social", () => ({ socialState: vi.fn() }));
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listDuos).mockResolvedValue([]);
  vi.mocked(socialState).mockResolvedValue({
    friends: [{ id: "friend-1", name: "Camille" }],
    invitations: [],
  });
  vi.mocked(createDuelInvitation).mockResolvedValue({
    id: "invite-1",
    recipientFound: true,
  });
  vi.mocked(sendDuelInvitationEmail).mockResolvedValue();
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});
it("retrouve un Duo créé en revenant au même écran et après remontage", async () => {
  vi.mocked(createDuel).mockResolvedValue("ABCD1234");
  const view = render(<AsyncDuel locale="fr" circles={[]} onBack={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Créer un duo/ }));
  expect(
    screen.getByRole("heading", { name: "Avec qui joues-tu ?" }),
  ).toBeTruthy();
  const continueButton = screen.getByRole("button", {
    name: /Continuer vers les dilemmes/,
  });
  await waitFor(() =>
    expect((continueButton as HTMLButtonElement).disabled).toBe(false),
  );
  fireEvent.click(continueButton);
  for (let i = 0; i < 5; i++) {
    fireEvent.click(screen.getByRole("button", { name: /^A / }));
    fireEvent.click(screen.getByRole("button", { name: /^A / }));
  }
  await screen.findByText("ABCD1234");
  vi.mocked(listDuos).mockResolvedValue([
    {
      code: "ABCD1234",
      createdAt: new Date().toISOString(),
      complete: false,
      expired: false,
      owner: true,
    },
  ]);
  fireEvent.click(screen.getByRole("button", { name: /Mes duos/ }));
  await screen.findByText("Duo · ABCD1234");
  view.unmount();
  render(<AsyncDuel locale="fr" circles={[]} onBack={vi.fn()} />);
  await screen.findByText("Duo · ABCD1234");
  vi.mocked(readDuel).mockResolvedValue({
    code: "ABCD1234",
    questions: [],
    complete: false,
    owner: true,
    ownerAnswers: null,
    guestAnswers: null,
  });
  fireEvent.click(screen.getByRole("button", { name: "Voir le code" }));
  await screen.findByText("ABCD1234");
  expect(readDuel).toHaveBeenCalledWith("ABCD1234");
});
it("lance directement un Duo reçu depuis Mes duos", async () => {
  vi.mocked(listDuos).mockResolvedValue([
    {
      code: "RECU1234",
      createdAt: new Date().toISOString(),
      complete: false,
      expired: false,
      owner: false,
      invited: true,
    },
  ]);
  vi.mocked(readDuel).mockResolvedValue({
    code: "RECU1234",
    questions: ["balanced-a01"],
    complete: false,
    owner: false,
    ownerAnswers: null,
    guestAnswers: null,
  });
  render(<AsyncDuel locale="fr" circles={[]} onBack={vi.fn()} />);
  const received = await screen.findByRole("button", {
    name: "Lancer le Duo RECU1234",
  });
  fireEvent.click(received);
  await waitFor(() => expect(readDuel).toHaveBeenCalledWith("RECU1234"));
  expect(await screen.findByText("Ton choix")).toBeTruthy();
});
it("permet de réessayer la dernière réponse après une erreur", async () => {
  vi.mocked(createDuel)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce("ABCD1234");
  render(<AsyncDuel locale="fr" circles={[]} onBack={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Créer un duo/ }));
  const continueButton = screen.getByRole("button", {
    name: /Continuer vers les dilemmes/,
  });
  await waitFor(() =>
    expect((continueButton as HTMLButtonElement).disabled).toBe(false),
  );
  fireEvent.click(continueButton);
  for (let i = 0; i < 5; i++) {
    fireEvent.click(screen.getByRole("button", { name: /^A / }));
    fireEvent.click(screen.getByRole("button", { name: /^A / }));
  }
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: /^B / }));
  await screen.findByText("ABCD1234");
  await waitFor(() => expect(createDuel).toHaveBeenCalledTimes(2));
  expect(vi.mocked(createDuel).mock.calls[1]?.[1]).toHaveLength(5);
  expect(vi.mocked(createDuel).mock.calls[1]?.[3]).toHaveLength(5);
  expect(createDuelInvitation).toHaveBeenCalledWith(
    "ABCD1234",
    "friend-1",
    null,
  );
});

it("propose ami ou cercle avant le premier dilemme", async () => {
  render(
    <AsyncDuel
      locale="fr"
      circles={[
        {
          id: "circle-1",
          name: "Les proches",
          code: "CIRCLE01",
          owner: true,
          members: 3,
          duels: 0,
        },
      ]}
      onBack={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /Créer un duo/ }));
  expect(screen.getByRole("button", { name: /Envoyer à un ami/ })).toBeTruthy();
  expect(
    screen.getByRole("button", { name: /Le faire dans un cercle/ }),
  ).toBeTruthy();
  expect(screen.queryByText("Ton choix")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: /Le faire dans un cercle/ }),
  );
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "circle-1" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: /Continuer vers les dilemmes/ }),
  );
  expect(screen.getByText("Ton choix")).toBeTruthy();
});

it("demande une adresse e-mail quand la liste d’amis est vide", async () => {
  vi.mocked(socialState).mockResolvedValue({ friends: [], invitations: [] });
  render(<AsyncDuel locale="fr" circles={[]} onBack={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Créer un duo/ }));
  expect(
    await screen.findByText(/Tu n’as pas encore d’ami dans Dilemme/),
  ).toBeTruthy();
  const continueButton = screen.getByRole("button", {
    name: /Continuer vers les dilemmes/,
  });
  expect((continueButton as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/Adresse e-mail/), {
    target: { value: "ami@example.fr" },
  });
  expect((continueButton as HTMLButtonElement).disabled).toBe(false);
});

it("ouvre un lien direct et permet de partager un Duo", async () => {
  vi.mocked(readDuel).mockResolvedValue({
    code: "ABCD1234",
    questions: [],
    complete: false,
    owner: true,
    ownerAnswers: null,
    guestAnswers: null,
  });
  render(
    <AsyncDuel
      locale="fr"
      circles={[]}
      initialCode="ABCD1234"
      onBack={vi.fn()}
    />,
  );
  await screen.findByText("ABCD1234");
  expect(readDuel).toHaveBeenCalledWith("ABCD1234");
  fireEvent.click(
    screen.getByRole("button", { name: /Partager l’invitation/ }),
  );
  await waitFor(() =>
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("?account=1&duo=ABCD1234"),
    ),
  );
  expect(await screen.findByText("Lien d’invitation copié.")).toBeTruthy();
});
