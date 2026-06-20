import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Region } from "../domain/models/Region";
import type { IRegionRepository } from "../domain/repositories/IRegionRepository";
import { GetRegionsUseCase } from "./GetRegionsUseCase";

function region(id: string, name: string, parentId?: string): Region {
  return {
    id,
    type: "city",
    name,
    coordinate: { lat: 0, lng: 0 },
    ...(parentId ? { parentId } : {}),
  };
}

describe("GetRegionsUseCase", () => {
  let repo: IRegionRepository;
  let useCase: GetRegionsUseCase;

  beforeEach(() => {
    repo = {
      findByType: vi.fn(),
      findByTypeAndParent: vi.fn(),
      findRandom: vi.fn(),
      findRandomTownAmongParentIds: vi.fn(),
    };
    useCase = new GetRegionsUseCase(repo);
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

    const result = await useCase.run({ type: "prefecture" });

    expect(repo.findByType).toHaveBeenCalledWith("prefecture");
    expect(result).toEqual(prefectures);
  });

  it("throws when type is city without parentId", async () => {
    await expect(useCase.run({ type: "city" })).rejects.toThrow(
      "parent_id is required when type=city",
    );
  });

  it("merges designated cities when mergeDesignated is true", async () => {
    const cities: Region[] = [
      region("27102", "大阪市北区", "27"),
      region("27103", "大阪市中央区", "27"),
      region("DC-27-大阪市", "大阪市", "27"),
      region("27201", "堺市", "27"),
    ];
    vi.mocked(repo.findByTypeAndParent).mockResolvedValue(cities);

    const result = await useCase.run({
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
      useCase.run({ type: "town" as unknown as "prefecture" }),
    ).rejects.toThrow("Unsupported type: town");
  });

  it("returns raw cities when mergeDesignated is false", async () => {
    const cities: Region[] = [
      region("27102", "大阪市北区", "27"),
      region("DC-27-大阪市", "大阪市", "27"),
    ];
    vi.mocked(repo.findByTypeAndParent).mockResolvedValue(cities);

    const result = await useCase.run({
      type: "city",
      parentId: "27",
      mergeDesignated: false,
    });

    expect(result).toEqual(cities);
  });
});
