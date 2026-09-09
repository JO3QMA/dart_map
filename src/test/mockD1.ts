import { vi } from "vitest";

export type MockD1Row = {
  id: string;
  type: string;
  name: string;
  lat: number;
  lng: number;
  parent_id: string | null;
};

export interface MockD1Options {
  allResults?: MockD1Row[];
  firstResult?: MockD1Row | null;
  throwOnQuery?: boolean;
}

export function createMockDb(options: MockD1Options = {}): D1Database {
  return {
    prepare: vi.fn(() => ({
      bind: vi.fn(() => ({
        all: vi.fn(async () => {
          if (options.throwOnQuery) throw new Error("DB failure");
          return { results: options.allResults ?? [] };
        }),
        first: vi.fn(async () => options.firstResult ?? null),
      })),
    })),
  } as unknown as D1Database;
}
