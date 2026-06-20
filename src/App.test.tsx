import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import App from "./App";
import { fetchRandomTarget, fetchRegions } from "./services/dataService";
import type { Region } from "./types";

vi.mock("./services/dataService", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./services/dataService")>();
  return {
    ...actual,
    fetchRegions: vi.fn().mockResolvedValue([]),
    fetchRandomTarget: vi.fn(),
  };
});

vi.mock("./components/InteractiveMap", () => ({
  default: ({
    onThrow,
    isAnimating,
  }: {
    onThrow?: (x: number, y: number) => void;
    isAnimating?: boolean;
  }) => (
    <div data-testid="interactive-map" data-animating={String(isAnimating)}>
      <button
        data-testid="throw"
        type="button"
        onClick={() => onThrow?.(50, 50)}
      >
        throw
      </button>
    </div>
  ),
}));

const kyoto: Region = {
  id: "kyoto",
  type: "prefecture",
  name: "京都府",
  coordinate: { lat: 35.0116, lng: 135.7681 },
};

const tokyoPref: Region = {
  id: "13",
  type: "prefecture",
  name: "東京都",
  coordinate: { lat: 35.68, lng: 139.69 },
};

const chiyoda: Region = {
  id: "13101",
  type: "city",
  name: "千代田区",
  coordinate: { lat: 35.69, lng: 139.75 },
  parentId: "13",
};

describe("App", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    vi.mocked(fetchRegions).mockResolvedValue([]);
    vi.mocked(fetchRandomTarget).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  it("renders header and region selector", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /ダーツの旅/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/エリアモードを選択/)).toBeInTheDocument();
    expect(screen.getByTestId("interactive-map")).toBeInTheDocument();
  });

  it("restores result modal from shared URL params", () => {
    const search =
      "?id=kyoto&type=prefecture&name=京都府&lat=35.0116&lng=135.7681&mode=country&parent=日本";
    window.history.replaceState(null, "", search);

    render(<App />);

    expect(screen.getByRole("heading", { name: "京都府" })).toBeInTheDocument();
    expect(
      screen.getByText("この結果は共有リンクから読み込まれました"),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "抽選結果" })).toHaveTextContent(
      "日本 京都府",
    );
  });

  it("smoke test: renders footer attribution links", () => {
    render(<App />);
    expect(screen.getByText(/© 2026 ダーツの旅/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Leaflet" })).toBeInTheDocument();
  });

  it("shows modal and ResultBar after successful throw", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchRandomTarget).mockResolvedValue(kyoto);

    render(<App />);
    fireEvent.click(screen.getByTestId("throw"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(screen.getByRole("heading", { name: "京都府" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "抽選結果" })).toHaveTextContent(
      "京都府",
    );
  });

  it("handles fetch error without crashing", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(fetchRandomTarget).mockRejectedValue(new Error("network"));

    render(<App />);
    fireEvent.click(screen.getByTestId("throw"));

    await waitFor(() => {
      expect(screen.getByTestId("interactive-map")).toHaveAttribute(
        "data-animating",
        "false",
      );
    });

    expect(
      screen.queryByRole("heading", { name: "京都府" }),
    ).not.toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("drill down from modal updates mode and selection", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchRandomTarget).mockResolvedValue(kyoto);

    render(<App />);
    fireEvent.click(screen.getByTestId("throw"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    fireEvent.click(
      screen.getByRole("button", { name: /京都府内をさらに探索する/ }),
    );

    expect(screen.getByRole("button", { name: /都道府県内/ })).toHaveClass(
      "active",
    );
    expect(
      screen.queryByRole("heading", { name: "京都府" }),
    ).not.toBeInTheDocument();
  });

  it("closes modal via close button", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchRandomTarget).mockResolvedValue(kyoto);

    render(<App />);
    fireEvent.click(screen.getByTestId("throw"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    fireEvent.click(document.getElementById("modal-close-btn")!);

    expect(
      screen.queryByRole("heading", { name: "京都府" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "抽選結果" }),
    ).toBeInTheDocument();
  });

  it("resolves prefecture name via fetchRegions effect", async () => {
    vi.mocked(fetchRegions).mockResolvedValue([tokyoPref]);

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /都道府県内/ }));

    await waitFor(() => {
      expect(document.getElementById("prefecture-select")).toBeInTheDocument();
    });

    fireEvent.change(document.getElementById("prefecture-select")!, {
      target: { value: "13" },
    });

    await waitFor(() => {
      expect(fetchRegions).toHaveBeenCalledWith("prefecture");
    });
  });

  it("resolves city name via fetchRegions effect in city mode", async () => {
    vi.mocked(fetchRegions).mockImplementation(async (level) => {
      if (level === "prefecture") return [tokyoPref];
      if (level === "city") return [chiyoda];
      return [];
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /市区町村内/ }));

    await waitFor(() => {
      expect(document.getElementById("prefecture-select")).toBeInTheDocument();
    });

    fireEvent.change(document.getElementById("prefecture-select")!, {
      target: { value: "13" },
    });

    await waitFor(() => {
      expect(document.getElementById("city-select")).toBeInTheDocument();
    });

    fireEvent.change(document.getElementById("city-select")!, {
      target: { value: "13101" },
    });

    await waitFor(() => {
      expect(fetchRegions).toHaveBeenCalledWith("city", "13", false);
    });
  });

  it("resolves ward parent name when town is drawn in city mode", async () => {
    const town: Region = {
      id: "13101-001",
      type: "town",
      name: "丸の内",
      coordinate: { lat: 35.68, lng: 139.76 },
      parentId: "13101",
    };

    vi.mocked(fetchRegions).mockImplementation(async (level, parentId) => {
      if (level === "prefecture") return [tokyoPref];
      if (level === "city" && parentId === "13") return [chiyoda];
      return [];
    });
    vi.mocked(fetchRandomTarget).mockResolvedValue(town);

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /市区町村内/ }));

    await waitFor(() => {
      expect(document.getElementById("prefecture-select")).toBeInTheDocument();
    });

    fireEvent.change(document.getElementById("prefecture-select")!, {
      target: { value: "13" },
    });

    await waitFor(() => {
      expect(document.getElementById("city-select")).toBeInTheDocument();
    });

    fireEvent.change(document.getElementById("city-select")!, {
      target: { value: "13101" },
    });

    fireEvent.click(screen.getByTestId("throw"));

    vi.useFakeTimers();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    vi.useRealTimers();

    expect(screen.getByRole("region", { name: "抽選結果" })).toHaveTextContent(
      "千代田区 丸の内",
    );
  });

  it("ignores duplicate throws while animating", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchRandomTarget).mockResolvedValue(kyoto);

    render(<App />);
    fireEvent.click(screen.getByTestId("throw"));
    fireEvent.click(screen.getByTestId("throw"));

    expect(fetchRandomTarget).toHaveBeenCalledOnce();
  });

  it("drill down to city mode from prefecture-level result", async () => {
    vi.mocked(fetchRegions).mockResolvedValue([tokyoPref, chiyoda]);
    vi.mocked(fetchRandomTarget).mockResolvedValue(chiyoda);

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /都道府県内/ }));

    await waitFor(() => {
      expect(document.getElementById("prefecture-select")).toBeInTheDocument();
    });

    fireEvent.change(document.getElementById("prefecture-select")!, {
      target: { value: "13" },
    });

    fireEvent.click(screen.getByTestId("throw"));

    vi.useFakeTimers();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    vi.useRealTimers();

    fireEvent.click(
      screen.getByRole("button", { name: /千代田区内をさらに探索する/ }),
    );

    expect(screen.getByRole("button", { name: /市区町村内/ })).toHaveClass(
      "active",
    );
  });

  it("updates URL after successful throw", async () => {
    vi.useFakeTimers();
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");
    vi.mocked(fetchRandomTarget).mockResolvedValue(kyoto);

    render(<App />);
    fireEvent.click(screen.getByTestId("throw"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(replaceStateSpy).toHaveBeenCalled();
    replaceStateSpy.mockRestore();
  });
});
