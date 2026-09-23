// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeGamePreview } from "./HomeGamePreview";

const vote = vi.hoisted(() => vi.fn());
vi.mock("../services/public-votes", () => ({ publicVote: vote }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("homepage game preview", () => {
  it("plays three dilemmas, reveals results and starts the full game", async () => {
    vote.mockResolvedValue({ mine: 0, a: 64, b: 36 });
    const start = vi.fn();
    render(<HomeGamePreview locale="fr" onStart={start} />);

    for (let round = 0; round < 3; round += 1) {
      fireEvent.click(screen.getByRole("button", { name: /A / }));
      await waitFor(() => expect(screen.getByText("64%")).toBeTruthy());
      fireEvent.click(
        screen.getByRole("button", {
          name: round === 2 ? /Voir la suite/ : /Dilemme suivant/,
        }),
      );
    }

    expect(screen.getByText("Tes choix ne font que commencer.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Commencer le jeu/ }));
    expect(start).toHaveBeenCalledOnce();
    expect(vote).toHaveBeenCalledTimes(3);
  });
});
