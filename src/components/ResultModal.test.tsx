import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ResultModal from "./ResultModal";
import type { Region } from "../types";

const mockRegion: Region = {
  id: "osaka",
  type: "prefecture",
  name: "大阪府",
  coordinate: { lat: 34.6937, lng: 135.5023 },
};

describe("ResultModal", () => {
  const defaultProps = {
    result: mockRegion,
    mode: "country" as const,
    onClose: vi.fn(),
    onDrillDown: vi.fn(),
  };

  it("renders result name, parent, and coordinates", () => {
    render(<ResultModal {...defaultProps} parentName="近畿地方" />);
    expect(screen.getByRole("heading", { name: "大阪府" })).toBeInTheDocument();
    expect(screen.getByText("近畿地方")).toBeInTheDocument();
    expect(screen.getByText(/34\.6937,\s*135\.5023/)).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<ResultModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(document.getElementById("modal-close-btn")!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<ResultModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(document.getElementById("result-modal-overlay")!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose when modal content is clicked", () => {
    const onClose = vi.fn();
    render(<ResultModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(document.getElementById("result-modal")!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onDrillDown when drill down button is clicked", () => {
    const onDrillDown = vi.fn();
    render(<ResultModal {...defaultProps} onDrillDown={onDrillDown} />);
    fireEvent.click(document.getElementById("drill-down-btn")!);
    expect(onDrillDown).toHaveBeenCalledOnce();
    expect(onDrillDown).toHaveBeenCalledWith("prefecture", "osaka");
  });

  it("shows shared result banner when isSharedResult is true", () => {
    render(<ResultModal {...defaultProps} isSharedResult />);
    expect(
      screen.getByText("この結果は共有リンクから読み込まれました"),
    ).toBeInTheDocument();
  });

  it("hides shared result banner when isSharedResult is false", () => {
    render(<ResultModal {...defaultProps} isSharedResult={false} />);
    expect(
      screen.queryByText("この結果は共有リンクから読み込まれました"),
    ).not.toBeInTheDocument();
  });

  it("renders ShareButtons", () => {
    render(<ResultModal {...defaultProps} />);
    expect(screen.getByTitle("Mastodonでシェア")).toBeInTheDocument();
    expect(screen.getByTitle("Misskeyでシェア")).toBeInTheDocument();
  });
});
