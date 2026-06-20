import { describe, it, expect, vi } from "vitest";
import { D1RegionRepository } from "./D1RegionRepository";

interface D1Row {
  id: string;
  type: string;
  name: string;
  lat: number;
  lng: number;
  parent_id: string | null;
}

function createMockDb() {
  const first = vi.fn();
  const all = vi.fn();
  const bind = vi.fn(() => ({ first, all }));
  const prepare = vi.fn(() => ({ bind }));
  const db = { prepare } as unknown as D1Database;
  return { db, prepare, bind, first, all };
}

describe("D1RegionRepository", () => {
  it("findByType maps rows to regions", async () => {
    const { db, prepare, bind, all } = createMockDb();
    const rows: D1Row[] = [
      {
        id: "13",
        type: "prefecture",
        name: "東京都",
        lat: 35.68,
        lng: 139.69,
        parent_id: "JP",
      },
    ];
    all.mockResolvedValue({ results: rows });
    const repo = new D1RegionRepository(db);

    const result = await repo.findByType("prefecture");

    expect(prepare).toHaveBeenCalledWith(
      "SELECT id, type, name, lat, lng, parent_id FROM regions WHERE type = ?",
    );
    expect(bind).toHaveBeenCalledWith("prefecture");
    expect(result).toEqual([
      {
        id: "13",
        type: "prefecture",
        name: "東京都",
        coordinate: { lat: 35.68, lng: 139.69 },
        parentId: "JP",
      },
    ]);
  });

  it("findByTypeAndParent binds type and parentId", async () => {
    const { db, bind, all } = createMockDb();
    all.mockResolvedValue({ results: [] });
    const repo = new D1RegionRepository(db);

    await repo.findByTypeAndParent("city", "13");

    expect(bind).toHaveBeenCalledWith("city", "13");
  });

  it("findRandom returns null when no row is found", async () => {
    const { db, bind, first } = createMockDb();
    first.mockResolvedValue(null);
    const repo = new D1RegionRepository(db);

    const result = await repo.findRandom("city", "13");

    expect(bind).toHaveBeenCalledWith("city", "13");
    expect(result).toBeNull();
  });

  it("findRandom uses JP when parentId is null", async () => {
    const { db, bind, first } = createMockDb();
    first.mockResolvedValue({
      id: "13",
      type: "prefecture",
      name: "東京都",
      lat: 35.68,
      lng: 139.69,
      parent_id: "JP",
    });
    const repo = new D1RegionRepository(db);

    await repo.findRandom("prefecture", null);

    expect(bind).toHaveBeenCalledWith("prefecture", "JP");
  });

  it("findRandomTownAmongParentIds returns null for empty parentIds", async () => {
    const { db, prepare } = createMockDb();
    const repo = new D1RegionRepository(db);

    const result = await repo.findRandomTownAmongParentIds([]);

    expect(prepare).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("findByType handles missing results array", async () => {
    const { db, all } = createMockDb();
    all.mockResolvedValue({});
    const repo = new D1RegionRepository(db);

    await expect(repo.findByType("prefecture")).resolves.toEqual([]);
  });

  it("findByTypeAndParent handles missing results array", async () => {
    const { db, all } = createMockDb();
    all.mockResolvedValue({});
    const repo = new D1RegionRepository(db);

    await expect(repo.findByTypeAndParent("city", "13")).resolves.toEqual([]);
  });

  it("maps null parent_id to undefined", async () => {
    const { db, all } = createMockDb();
    all.mockResolvedValue({
      results: [
        {
          id: "13",
          type: "prefecture",
          name: "東京都",
          lat: 35.68,
          lng: 139.69,
          parent_id: null,
        },
      ],
    });
    const repo = new D1RegionRepository(db);

    const result = await repo.findByType("prefecture");

    expect(result[0].parentId).toBeUndefined();
  });

  it("findRandomTownAmongParentIds returns null when no row is found", async () => {
    const { db, first } = createMockDb();
    first.mockResolvedValue(null);
    const repo = new D1RegionRepository(db);

    await expect(
      repo.findRandomTownAmongParentIds(["27102"]),
    ).resolves.toBeNull();
  });

  it("findRandomTownAmongParentIds binds ward IDs and maps result", async () => {
    const { db, bind, first } = createMockDb();
    first.mockResolvedValue({
      id: "27102-001",
      type: "town",
      name: "梅田",
      lat: 34.7,
      lng: 135.5,
      parent_id: "27102",
    });
    const repo = new D1RegionRepository(db);

    const result = await repo.findRandomTownAmongParentIds([
      "27102",
      "27103",
    ]);

    expect(bind).toHaveBeenCalledWith("27102", "27103");
    expect(result).toEqual({
      id: "27102-001",
      type: "town",
      name: "梅田",
      coordinate: { lat: 34.7, lng: 135.5 },
      parentId: "27102",
    });
  });
});
