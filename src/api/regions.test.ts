import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Region } from "../types";
import { D1RegionRepository } from "./infrastructure/database/D1RegionRepository";
import { drawRegion, getRegions } from "./regions";

function city(id: string, name: string, parentId?: string): Region {
  return {
    id,
    type: "city",
    name,
    coordinate: { lat: 0, lng: 0 },
    ...(parentId ? { parentId } : {}),
  };
}

function town(id: string, name: string, parentId: string): Region {
  return {
    id,
    type: "town",
    name,
    coordinate: { lat: 0, lng: 0 },
    parentId,
  };
}

describe("getRegions", () => {
  let repo: D1RegionRepository;

  beforeEach(() => {
    repo = {
      findByType: vi.fn(),
      findByTypeAndParent: vi.fn(),
      findRandom: vi.fn(),
      findRandomTownAmongParentIds: vi.fn(),
    } as unknown as D1RegionRepository;
  });

  it("returns prefecture list when type is prefecture", async () => {
    const prefectures: Region[] = [
      {
        id: "13",
        type: "prefecture",
        name: "東京都",
        coordinate: { lat: 35.68, lng: 139.69 },
      },
    ];
    vi.mocked(repo.findByType).mockResolvedValue(prefectures);

    const result = await getRegions(repo, { type: "prefecture" });

    expect(repo.findByType).toHaveBeenCalledWith("prefecture");
    expect(result).toEqual(prefectures);
  });

  it("throws when type is city without parentId", async () => {
    await expect(getRegions(repo, { type: "city" })).rejects.toThrow(
      "parent_id is required when type=city",
    );
  });

  it("merges designated cities when mergeDesignated is true", async () => {
    const cities: Region[] = [
      city("27102", "大阪市北区", "27"),
      city("27103", "大阪市中央区", "27"),
      city("DC-27-大阪市", "大阪市", "27"),
      city("27201", "堺市", "27"),
    ];
    vi.mocked(repo.findByTypeAndParent).mockResolvedValue(cities);

    const result = await getRegions(repo, {
      type: "city",
      parentId: "27",
      mergeDesignated: true,
    });

    expect(repo.findByTypeAndParent).toHaveBeenCalledWith("city", "27");
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toEqual(["堺市", "大阪市"]);
    expect(result.find((r) => r.id === "27102")).toBeUndefined();
  });

  it("throws for unsupported type", async () => {
    await expect(
      getRegions(repo, { type: "town" as unknown as "prefecture" }),
    ).rejects.toThrow("Unsupported type: town");
  });

  it("returns raw cities when mergeDesignated is false", async () => {
    const cities: Region[] = [
      city("27102", "大阪市北区", "27"),
      city("DC-27-大阪市", "大阪市", "27"),
    ];
    vi.mocked(repo.findByTypeAndParent).mockResolvedValue(cities);

    const result = await getRegions(repo, {
      type: "city",
      parentId: "27",
      mergeDesignated: false,
    });

    expect(result).toEqual(cities);
  });
});

describe("drawRegion", () => {
  let repo: D1RegionRepository;

  beforeEach(() => {
    repo = {
      findByType: vi.fn(),
      findByTypeAndParent: vi.fn(),
      findRandom: vi.fn(),
      findRandomTownAmongParentIds: vi.fn(),
    } as unknown as D1RegionRepository;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("draws a random prefecture in country mode", async () => {
    const prefecture: Region = {
      id: "13",
      type: "prefecture",
      name: "東京都",
      coordinate: { lat: 35.68, lng: 139.69 },
    };
    vi.mocked(repo.findRandom).mockResolvedValue(prefecture);

    const result = await drawRegion(repo, { mode: "country" });

    expect(repo.findRandom).toHaveBeenCalledWith("prefecture", "JP");
    expect(result).toEqual(prefecture);
  });

  it("draws a random city in prefecture mode without mergeDesignated", async () => {
    const drawn = city("13101", "千代田区", "13");
    vi.mocked(repo.findRandom).mockResolvedValue(drawn);

    const result = await drawRegion(repo, {
      mode: "prefecture",
      parentId: "13",
      mergeDesignated: false,
    });

    expect(repo.findRandom).toHaveBeenCalledWith("city", "13");
    expect(result).toEqual(drawn);
  });

  it("throws when prefecture mode lacks parentId", async () => {
    await expect(drawRegion(repo, { mode: "prefecture" })).rejects.toThrow(
      "parent_id is required when mode=prefecture",
    );
  });

  it("picks from merged cities in prefecture mode with mergeDesignated", async () => {
    const cities: Region[] = [
      city("27102", "大阪市北区", "27"),
      city("DC-27-大阪市", "大阪市", "27"),
      city("27201", "堺市", "27"),
    ];
    vi.mocked(repo.findByTypeAndParent).mockResolvedValue(cities);
    vi.spyOn(Math, "random").mockReturnValue(0);

    const result = await drawRegion(repo, {
      mode: "prefecture",
      parentId: "27",
      mergeDesignated: true,
    });

    expect(result?.name).toBe("堺市");
  });

  it("returns null when merged city list is empty", async () => {
    vi.mocked(repo.findByTypeAndParent).mockResolvedValue([]);

    const result = await drawRegion(repo, {
      mode: "prefecture",
      parentId: "27",
      mergeDesignated: true,
    });

    expect(result).toBeNull();
  });

  it("draws a random town in city mode for a regular city", async () => {
    const drawn = town("13101-001", "丸の内", "13101");
    vi.mocked(repo.findRandom).mockResolvedValue(drawn);

    const result = await drawRegion(repo, {
      mode: "city",
      parentId: "13101",
    });

    expect(repo.findRandom).toHaveBeenCalledWith("town", "13101");
    expect(result).toEqual(drawn);
  });

  it("throws when city mode lacks parentId", async () => {
    await expect(drawRegion(repo, { mode: "city" })).rejects.toThrow(
      "parent_id is required when mode=city",
    );
  });

  it("draws a ward town for a designated city parent", async () => {
    const wards = [
      city("27102", "大阪市北区", "27"),
      city("27103", "大阪市中央区", "27"),
    ];
    const drawn = town("27102-001", "梅田", "27102");
    vi.mocked(repo.findByTypeAndParent).mockResolvedValue(wards);
    vi.mocked(repo.findRandomTownAmongParentIds).mockResolvedValue(drawn);

    const result = await drawRegion(repo, {
      mode: "city",
      parentId: "DC-27-大阪市",
    });

    expect(repo.findByTypeAndParent).toHaveBeenCalledWith("city", "27");
    expect(repo.findRandomTownAmongParentIds).toHaveBeenCalledWith([
      "27102",
      "27103",
    ]);
    expect(result).toEqual(drawn);
  });

  it("returns null for invalid designated city ID", async () => {
    const result = await drawRegion(repo, {
      mode: "city",
      parentId: "DC-13-東京都",
    });

    expect(result).toBeNull();
  });

  it("throws for unsupported mode", async () => {
    await expect(
      drawRegion(repo, { mode: "town" as unknown as "country" }),
    ).rejects.toThrow("Unsupported mode: town");
  });

  it("returns null when no wards exist for designated city", async () => {
    vi.mocked(repo.findByTypeAndParent).mockResolvedValue([
      city("DC-27-大阪市", "大阪市", "27"),
    ]);

    const result = await drawRegion(repo, {
      mode: "city",
      parentId: "DC-27-大阪市",
    });

    expect(result).toBeNull();
  });
});
