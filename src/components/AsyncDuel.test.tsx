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
import { listDuos, createDuel, readDuel } from "../services/player-features";
vi.mock("../services/player-features", () => ({
  listDuos: vi.fn(),
  createDuel: vi.fn(),
  readDuel: vi.fn(),
  answerDuel: vi.fn(),
}));
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listDuos).mockResolvedValue([]);
});
it("retrouve un Duo créé en revenant au même écran et après remontage", async () => {
  vi.mocked(createDuel).mockResolvedValue("ABCD1234");
  const view = render(<AsyncDuel locale="fr" circles={[]} onBack={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Créer un duo/ }));
  expect(
    screen.getByRole("heading", { name: "Avec qui joues-tu ?" }),
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: /Continuer vers les dilemmes/ }),
  );
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
it("permet de réessayer la dernière réponse après une erreur", async () => {
  vi.mocked(createDuel)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce("ABCD1234");
  render(<AsyncDuel locale="fr" circles={[]} onBack={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Créer un duo/ }));
  fireEvent.click(
    screen.getByRole("button", { name: /Continuer vers les dilemmes/ }),
  );
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
