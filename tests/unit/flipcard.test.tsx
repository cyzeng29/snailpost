// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { FlipCard, type Face } from "@/components/postcard/FlipCard";

function Harness() {
  const [face, setFace] = useState<Face>("front");
  return (
    <FlipCard
      face={face}
      onFaceChange={setFace}
      label="Card"
      front={<a href="#front-link">Front link</a>}
      back={<a href="#back-link">Back link</a>}
    />
  );
}

describe("FlipCard", () => {
  it("keeps the hidden face out of the tab order and accessibility tree", async () => {
    render(<Harness />);
    const front = screen.getByLabelText("Card, front");
    const back = screen.getByLabelText("Card, back", { selector: "section" });
    expect(front).not.toHaveAttribute("inert");
    expect(back).toHaveAttribute("inert");
    expect(back).toHaveAttribute("aria-hidden", "true");

    await userEvent.click(screen.getByRole("button", { name: "Read the back" }));
    expect(front).toHaveAttribute("inert");
    expect(back).not.toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "See the front" })).toBeInTheDocument();
  });

  // jsdom doesn't implement `inert` for focus, so real tab order through the
  // hidden face is verified in a browser (tests/e2e/postcard.spec.ts).
  it("works from the keyboard and announces the visible face", async () => {
    render(<Harness />);
    const user = userEvent.setup();
    screen.getByRole("button", { name: "Read the back" }).focus();
    await user.keyboard("{Enter}");
    expect(screen.getByText("Showing the back of the postcard.")).toBeInTheDocument();
    await user.keyboard(" ");
    expect(screen.getByText("Showing the front of the postcard.")).toBeInTheDocument();
  });
});
