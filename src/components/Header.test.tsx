import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Header from "./Header";

describe("Header", () => {
  it("renders the app title", () => {
    render(<Header />);
    expect(
      screen.getByRole("heading", { name: /ダーツの旅/ }),
    ).toBeInTheDocument();
  });

  it("renders the tagline", () => {
    render(<Header />);
    expect(
      screen.getByText(/ダーツを投げて、まだ見ぬ場所へ旅立とう/),
    ).toBeInTheDocument();
  });
});
