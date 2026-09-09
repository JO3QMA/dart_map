import type { Context } from "hono";
import { D1RegionRepository } from "../infrastructure/database/D1RegionRepository";
import type { Env } from "./router";

export type DbEnv = Pick<Env, "DB">;

export const JSON_UTF8 = {
  "Content-Type": "application/json; charset=utf-8",
} as const;

export function regionRepo(c: Context<{ Bindings: DbEnv }>) {
  return new D1RegionRepository(c.env.DB);
}
