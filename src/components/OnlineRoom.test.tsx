// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { OnlineRoom } from "./OnlineRoom";
import { roomRequest } from "../services/rooms";
import { playerAuth } from "../services/supabase";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qr") },
}));
vi.mock("../services/rooms", async (original) => ({
  ...(await original<typeof import("../services/rooms")>()),
  roomRequest: vi.fn(),
}));
vi.mock("../services/supabase", () => ({
  playerAuth: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  history.replaceState(null, "", "/#room=ABCDEF12");
  vi.stubGlobal("crypto", {
    ...crypto,
    randomUUID: () => "11111111-1111-4111-8111-111111111111",
  });
  vi.mocked(playerAuth.auth.getUser).mockResolvedValue({
    data: {
      user: {
        id: "user-1",
        email: "alex@example.com",
        user_metadata: { display_name: "Alex" },
      },
    },
    error: null,
  } as never);
  vi.mocked(playerAuth.auth.onAuthStateChange).mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  } as never);
  vi.mocked(roomRequest).mockResolvedValue({
    code: "ABCDEF12",
    phase: "lobby",
    round: 0,
    seed: 1,
    settings: {
      pack: "general",
      length: 10,
      timer: 20,
      reveal: "round",
      predictions: true,
    },
    me: "player-1",
    host: "host-1",
    serverNow: new Date().toISOString(),
    startedAt: null,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    question: null,
    deck: null,
    players: [
      { id: "host-1", name: "Camille", online: true, answered: false },
      { id: "player-1", name: "Alex", online: true, answered: false },
    ],
    predictions: [],
    answers: [],
  });
});

it("rejoint automatiquement une invitation avec le pseudo du compte connecté", async () => {
  render(<OnlineRoom locale="fr" onBack={vi.fn()} />);

  expect(screen.getByText("Connexion automatique à la partie…")).toBeTruthy();
  expect(screen.queryByLabelText("Ton pseudo")).toBeNull();

  await waitFor(() =>
    expect(roomRequest).toHaveBeenCalledWith(
      "join",
      expect.objectContaining({ code: "ABCDEF12" }),
      { name: "Alex" },
    ),
  );
});
