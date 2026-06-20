import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RegionSelector from "./RegionSelector";
import { fetchRegions } from "../services/dataService";
import type { Region } from "../types";

vi.mock("../services/dataService", () => ({
  fetchRegions: vi.fn(),
}));

const mockPrefectures: Region[] = [
  {
    id: "tokyo",
    type: "prefecture",
    name: "東京都",
    coordinate: { lat: 35.6895, lng: 139.6917 },
  },
  {
    id: "osaka",
    type: "prefecture",
    name: "大阪府",
    coordinate: { lat: 34.6937, lng: 135.5023 },
  },
];

const mockCities: Region[] = [
  {
    id: "shibuya",
    type: "city",
    name: "渋谷区",
    coordinate: { lat: 35.664, lng: 139.698 },
    parentId: "tokyo",
  },
];

describe("RegionSelector", () => {
  const defaultProps = {
    mode: "country" as const,
    onModeChange: vi.fn(),
    selectedPrefecture: null,
    onPrefectureChange: vi.fn(),
    selectedCity: null,
    onCityChange: vi.fn(),
    mergeDesignatedCities: false,
    onMergeDesignatedCitiesChange: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(fetchRegions).mockImplementation(async (level, parentId) => {
      if (level === "prefecture") return mockPrefectures;
      if (level === "city" && parentId === "tokyo") return mockCities;
      return [];
    });
  });

  it("renders mode buttons", () => {
    render(<RegionSelector {...defaultProps} />);
    expect(screen.getByRole("button", { name: /日本全国/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /都道府県内/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /市区町村内/ }),
    ).toBeInTheDocument();
  });

  it("clears prefecture and city when switching to country mode", () => {
    const onModeChange = vi.fn();
    const onPrefectureChange = vi.fn();
    const onCityChange = vi.fn();
    render(
      <RegionSelector
        {...defaultProps}
        mode="city"
        selectedPrefecture="tokyo"
        selectedCity="shibuya"
        onModeChange={onModeChange}
        onPrefectureChange={onPrefectureChange}
        onCityChange={onCityChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /日本全国/ }));
    expect(onModeChange).toHaveBeenCalledWith("country");
    expect(onPrefectureChange).toHaveBeenCalledWith(null);
    expect(onCityChange).toHaveBeenCalledWith(null);
  });

  it("clears city when switching to prefecture mode", () => {
    const onModeChange = vi.fn();
    const onCityChange = vi.fn();
    render(
      <RegionSelector
        {...defaultProps}
        mode="city"
        selectedPrefecture="tokyo"
        selectedCity="shibuya"
        onModeChange={onModeChange}
        onCityChange={onCityChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /都道府県内/ }));
    expect(onModeChange).toHaveBeenCalledWith("prefecture");
    expect(onCityChange).toHaveBeenCalledWith(null);
  });

  it("shows prefecture select in prefecture mode", async () => {
    render(<RegionSelector {...defaultProps} mode="prefecture" />);
    await waitFor(() => {
      expect(document.getElementById("prefecture-select")).toBeInTheDocument();
    });
    expect(document.getElementById("city-select")).not.toBeInTheDocument();
  });

  it("shows prefecture and city selects in city mode", async () => {
    render(
      <RegionSelector
        {...defaultProps}
        mode="city"
        selectedPrefecture="tokyo"
      />,
    );
    await waitFor(() => {
      expect(document.getElementById("prefecture-select")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(document.getElementById("city-select")).toBeInTheDocument();
    });
  });

  it("renders merge designated cities checkbox when prefecture is selected", async () => {
    render(
      <RegionSelector
        {...defaultProps}
        mode="prefecture"
        selectedPrefecture="tokyo"
      />,
    );
    await waitFor(() => {
      expect(
        screen.getByRole("checkbox", { name: /政令指定都市の区をまとめる/ }),
      ).toBeInTheDocument();
    });
  });

  it("clears city when prefecture select is reset", async () => {
    const onPrefectureChange = vi.fn();
    const onCityChange = vi.fn();
    render(
      <RegionSelector
        {...defaultProps}
        mode="city"
        selectedPrefecture="tokyo"
        selectedCity="shibuya"
        onPrefectureChange={onPrefectureChange}
        onCityChange={onCityChange}
      />,
    );

    await waitFor(() => {
      expect(document.getElementById("prefecture-select")).toBeInTheDocument();
    });

    fireEvent.change(document.getElementById("prefecture-select")!, {
      target: { value: "" },
    });

    expect(onPrefectureChange).toHaveBeenCalledWith(null);
    expect(onCityChange).toHaveBeenCalledWith(null);
  });

  it("clears city when city select is reset", async () => {
    const onCityChange = vi.fn();
    render(
      <RegionSelector
        {...defaultProps}
        mode="city"
        selectedPrefecture="tokyo"
        selectedCity="shibuya"
        onCityChange={onCityChange}
      />,
    );

    await waitFor(() => {
      expect(document.getElementById("city-select")).toBeInTheDocument();
    });

    fireEvent.change(document.getElementById("city-select")!, {
      target: { value: "" },
    });

    expect(onCityChange).toHaveBeenCalledWith(null);
  });

  it("calls onMergeDesignatedCitiesChange when checkbox is toggled", async () => {
    const onMergeDesignatedCitiesChange = vi.fn();
    render(
      <RegionSelector
        {...defaultProps}
        mode="prefecture"
        selectedPrefecture="tokyo"
        onMergeDesignatedCitiesChange={onMergeDesignatedCitiesChange}
      />,
    );
    const checkbox = await screen.findByRole("checkbox", {
      name: /政令指定都市の区をまとめる/,
    });
    fireEvent.click(checkbox);
    expect(onMergeDesignatedCitiesChange).toHaveBeenCalledWith(true);
  });
});
