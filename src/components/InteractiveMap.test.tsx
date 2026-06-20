import { render, screen, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEffect, type ReactNode } from "react";
import InteractiveMap from "./InteractiveMap";
import type { Region } from "../types";

type MapClickHandler = (e: {
  containerPoint: { x: number; y: number };
}) => void;

let mapClickHandler: MapClickHandler | undefined;
const flyToBounds = vi.fn();
const flyTo = vi.fn();
let geoJsonBoundsThrows = false;
let geoJsonBoundsValid = true;

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => null,
  Marker: () => <div data-testid="marker" />,
  GeoJSON: ({
    eventHandlers,
    data,
    style,
    pointToLayer,
  }: {
    eventHandlers?: {
      add?: (e: {
        target: { getBounds: () => { isValid: () => boolean } };
      }) => void;
    };
    data?: unknown;
    style?: () => Record<string, unknown>;
    pointToLayer?: (feature: unknown, latlng: unknown) => unknown;
  }) => {
    useEffect(() => {
      style?.();
      pointToLayer?.({}, {});
      eventHandlers?.add?.({
        target: {
          getBounds: () => {
            if (geoJsonBoundsThrows) {
              throw new Error("invalid bounds");
            }
            return {
              isValid: () => geoJsonBoundsValid,
            };
          },
        },
      });
    }, [eventHandlers, style, pointToLayer]);
    return <div data-testid="geojson">{JSON.stringify(data)}</div>;
  },
  useMap: () => ({
    getSize: () => ({ x: 200, y: 100 }),
    getZoom: () => 6,
    flyTo,
    flyToBounds,
  }),
  useMapEvents: (handlers: { click?: MapClickHandler }) => {
    mapClickHandler = handlers.click;
    return null;
  },
}));

vi.mock("leaflet", () => ({
  default: {
    Icon: { Default: { mergeOptions: vi.fn() } },
    divIcon: vi.fn(() => ({})),
    circleMarker: vi.fn(),
  },
}));

const mockResult: Region = {
  id: "kyoto",
  type: "prefecture",
  name: "京都府",
  coordinate: { lat: 35.0116, lng: 135.7681 },
};

const cityResult: Region = {
  id: "13101",
  type: "city",
  name: "千代田区",
  coordinate: { lat: 35.69, lng: 139.75 },
};

const defaultProps = {
  isAnimating: false,
  onThrow: vi.fn(),
  disabled: false,
  mode: "country" as const,
  prefectureName: "",
  cityName: "",
  result: null,
};

const geoJsonResponse = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: { name: "Japan" },
      geometry: { type: "Polygon" as const, coordinates: [] },
    },
    {
      type: "Feature" as const,
      properties: { name: "Extra" },
      geometry: { type: "Polygon" as const, coordinates: [] },
    },
  ],
};

describe("InteractiveMap", () => {
  beforeEach(() => {
    mapClickHandler = undefined;
    geoJsonBoundsThrows = false;
    geoJsonBoundsValid = true;
    vi.mocked(defaultProps.onThrow).mockClear();
    flyTo.mockClear();
    flyToBounds.mockClear();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => geoJsonResponse,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders map container", () => {
    render(<InteractiveMap {...defaultProps} />);
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
    expect(document.getElementById("map-area")).toBeInTheDocument();
  });

  it("does not call onThrow when disabled", () => {
    render(<InteractiveMap {...defaultProps} disabled />);
    expect(
      screen.getByText("エリアを選択してください"),
    ).toBeInTheDocument();

    act(() => {
      mapClickHandler?.({
        containerPoint: { x: 50, y: 50 },
      });
    });

    expect(defaultProps.onThrow).not.toHaveBeenCalled();
  });

  it("calls onThrow with click coordinates when enabled", () => {
    const onThrow = vi.fn();
    render(<InteractiveMap {...defaultProps} onThrow={onThrow} />);

    act(() => {
      mapClickHandler?.({
        containerPoint: { x: 100, y: 50 },
      });
    });

    expect(onThrow).toHaveBeenCalledOnce();
    expect(onThrow).toHaveBeenCalledWith(50, 50);
  });

  it("does not call onThrow while animating", () => {
    const onThrow = vi.fn();
    render(
      <InteractiveMap {...defaultProps} onThrow={onThrow} isAnimating />,
    );

    act(() => {
      mapClickHandler?.({
        containerPoint: { x: 100, y: 50 },
      });
    });

    expect(onThrow).not.toHaveBeenCalled();
  });

  it("shows wait cursor while animating", () => {
    render(<InteractiveMap {...defaultProps} isAnimating />);
    expect(document.getElementById("map-area")).toHaveStyle({
      cursor: "wait",
    });
  });

  it("renders marker when result is provided", () => {
    render(<InteractiveMap {...defaultProps} result={mockResult} />);
    expect(screen.getByTestId("marker")).toBeInTheDocument();
  });

  it("fetches boundary for country mode with default query", async () => {
    render(<InteractiveMap {...defaultProps} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/boundary?q="),
      );
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent("日本")),
    );
  });

  it("fetches boundary using prefecture name in prefecture mode", async () => {
    render(
      <InteractiveMap
        {...defaultProps}
        mode="prefecture"
        prefectureName="東京都"
      />,
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("東京都")),
      );
    });
  });

  it("fetches boundary using city selection in city mode", async () => {
    render(
      <InteractiveMap
        {...defaultProps}
        mode="city"
        prefectureName="東京都"
        cityName="千代田区"
      />,
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/q=.*%E6%9D%B1%E4%BA%AC%E9%83%BD.*%E5%8D%83%E4%BB%A3%E7%94%B0%E5%8C%BA/),
      );
    });
  });

  it("uses result name in city mode query when result exists", async () => {
    render(
      <InteractiveMap
        {...defaultProps}
        mode="city"
        prefectureName="東京都"
        cityName="千代田区"
        result={cityResult}
        parentName="東京都"
      />,
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/q=.*%E6%9D%B1%E4%BA%AC%E9%83%BD.*%E5%8D%83%E4%BB%A3%E7%94%B0%E5%8C%BA/),
      );
    });
  });

  it("renders GeoJSON and flies to bounds after fetch", async () => {
    render(<InteractiveMap {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("geojson")).toBeInTheDocument();
    });

    expect(flyToBounds).toHaveBeenCalled();
    expect(screen.getByTestId("geojson").textContent).not.toContain("Extra");
  });

  it("fetches city boundary overlay in prefecture mode when result is a city", async () => {
    render(
      <InteractiveMap
        {...defaultProps}
        mode="prefecture"
        prefectureName="東京都"
        result={cityResult}
      />,
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/q=.*%E6%9D%B1%E4%BA%AC%E9%83%BD.*%E5%8D%83%E4%BB%A3%E7%94%B0%E5%8C%BA/),
    );
  });

  it("flies to result coordinate when result is set", async () => {
    render(<InteractiveMap {...defaultProps} result={mockResult} />);

    await waitFor(() => {
      expect(flyTo).toHaveBeenCalledWith(
        [mockResult.coordinate.lat, mockResult.coordinate.lng],
        9,
        { duration: 1.2 },
      );
    });
  });

  it("fetches boundary using result name in country mode", async () => {
    render(
      <InteractiveMap
        {...defaultProps}
        result={mockResult}
        parentName="日本"
      />,
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/q=.*%E6%97%A5%E6%9C%AC.*%E4%BA%AC%E9%83%BD%E5%BA%9C/),
      );
    });
  });

  it("skips boundary fetch when query is empty", async () => {
    render(
      <InteractiveMap
        {...defaultProps}
        mode="prefecture"
        prefectureName=""
      />,
    );

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it("hides base boundary when prefecture result city overlay is shown", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => geoJsonResponse,
    });

    render(
      <InteractiveMap
        {...defaultProps}
        mode="prefecture"
        prefectureName="東京都"
        result={cityResult}
      />,
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    const geojsonLayers = screen.getAllByTestId("geojson");
    expect(geojsonLayers).toHaveLength(1);
  });

  it("skips flyToBounds when GeoJSON bounds are invalid", async () => {
    geoJsonBoundsValid = false;

    render(<InteractiveMap {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("geojson")).toBeInTheDocument();
    });

    expect(flyToBounds).not.toHaveBeenCalled();
  });

  it("handles invalid GeoJSON bounds gracefully", async () => {
    geoJsonBoundsThrows = true;

    render(<InteractiveMap {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("geojson")).toBeInTheDocument();
    });

    expect(flyToBounds).not.toHaveBeenCalled();
  });

  it("handles boundary fetch failure gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<InteractiveMap {...defaultProps} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    expect(screen.queryByTestId("geojson")).not.toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("runs dart animation effects on map click", () => {
    vi.useFakeTimers();
    const onThrow = vi.fn();
    render(<InteractiveMap {...defaultProps} onThrow={onThrow} />);

    act(() => {
      mapClickHandler?.({
        containerPoint: { x: 80, y: 40 },
      });
    });

    expect(document.querySelector(".dart-fly")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(650);
    });

    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(onThrow).toHaveBeenCalledWith(40, 40);
  });
});
