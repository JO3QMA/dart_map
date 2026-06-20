import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ResultBar from "./ResultBar";
import type { Region } from "../types";

const mockRegion: Region = {
  id: "tokyo",
  type: "prefecture",
  name: "東京都",
  coordinate: { lat: 35.6895, lng: 139.6917 },
};

describe("ResultBar", () => {
  it("renders result name without parentName", () => {
    render(
      <ResultBar result={mockRegion} mode="country" onDrillDown={vi.fn()} />,
    );
    expect(screen.getByText(/🎯 東京都/)).toBeInTheDocument();
  });

  it("renders result name with parentName", () => {
    render(
      <ResultBar
        result={{ ...mockRegion, id: "shibuya", name: "渋谷区", type: "city" }}
        parentName="東京都"
        mode="prefecture"
        onDrillDown={vi.fn()}
      />,
    );
    expect(screen.getByText(/🎯 東京都 渋谷区/)).toBeInTheDocument();
  });

  it("renders Google Maps link with encoded query", () => {
    render(
      <ResultBar
        result={mockRegion}
        parentName="日本"
        mode="country"
        onDrillDown={vi.fn()}
      />,
    );
    const link = screen.getByRole("link", { name: /Googleマップ/ });
    expect(link).toHaveAttribute("href");
    expect(link.getAttribute("href")).toMatch(
      /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/,
    );
    expect(link.getAttribute("href")).toContain(
      encodeURIComponent("日本 東京都"),
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows drill down button in country mode", () => {
    render(
      <ResultBar result={mockRegion} mode="country" onDrillDown={vi.fn()} />,
    );
    expect(
      screen.getByRole("button", { name: /さらに探索する/ }),
    ).toBeInTheDocument();
  });

  it("shows drill down button in prefecture mode", () => {
    render(
      <ResultBar result={mockRegion} mode="prefecture" onDrillDown={vi.fn()} />,
    );
    expect(
      screen.getByRole("button", { name: /さらに探索する/ }),
    ).toBeInTheDocument();
  });

  it("hides drill down button in city mode", () => {
    render(
      <ResultBar
        result={{ ...mockRegion, type: "city" }}
        mode="city"
        onDrillDown={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /さらに探索する/ }),
    ).not.toBeInTheDocument();
  });

  it("calls onDrillDown with next mode and result id", () => {
    const onDrillDown = vi.fn();
    render(
      <ResultBar
        result={mockRegion}
        mode="country"
        onDrillDown={onDrillDown}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /さらに探索する/ }));
    expect(onDrillDown).toHaveBeenCalledOnce();
    expect(onDrillDown).toHaveBeenCalledWith("prefecture", "tokyo");
  });
});
