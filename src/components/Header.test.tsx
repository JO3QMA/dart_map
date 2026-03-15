import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Header from "./Header";

describe("Header", () => {
  it("renders the app title", () => {
    const { getByRole } = render(<Header />);
    expect(getByRole("heading", { name: /ダーツの旅/ })).toBeInTheDocument();
  });

  it("renders the tagline", () => {
    const { getByText } = render(<Header />);
    expect(
      getByText(/ダーツを投げて、まだ見ぬ場所へ旅立とう/),
    ).toBeInTheDocument();
  });
});
