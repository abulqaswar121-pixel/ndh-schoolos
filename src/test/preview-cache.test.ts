import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const workerSource = readFileSync("public/sw.js", "utf8");

type NavigationEvent = {
  request: {
    method: string;
    url: string;
    mode: string;
    headers: { has: (name: string) => boolean; get: () => string };
  };
  respondWith: (response: Promise<unknown>) => void;
};

async function offlineNavigation(path: string, authenticated = false) {
  const handlers = new Map<string, (event: NavigationEvent) => void>();
  const home = { page: "public-homepage" };
  const workspace = { page: "school-workspace" };
  const cached = new Map<string, unknown>([
    ["/", home],
    ["/app", workspace],
  ]);
  runInNewContext(workerSource, {
    self: {
      location: { origin: "https://school.example" },
      addEventListener: (name: string, handler: (event: NavigationEvent) => void) =>
        handlers.set(name, handler),
    },
    caches: {
      open: async () => ({
        match: async (key: unknown) => (typeof key === "string" ? cached.get(key) : undefined),
      }),
    },
    fetch: async () => {
      throw new Error("Offline");
    },
    URL,
    AbortController,
    setTimeout: () => 0,
    clearTimeout: () => undefined,
  });
  let response: Promise<unknown> | undefined;
  handlers.get("fetch")!({
    request: {
      method: "GET",
      url: `https://school.example${path}`,
      mode: "navigate",
      headers: {
        has: (name: string) => authenticated && name === "authorization",
        get: () => "text/html",
      },
    },
    respondWith: (result) => {
      response = result;
    },
  });
  return response;
}

describe("Original website preview cache", () => {
  it("never intercepts authenticated or API requests, even same-origin", async () => {
    expect(await offlineNavigation("/rest/v1/school_workspaces")).toBeUndefined();
    expect(await offlineNavigation("/api/cloud-school")).toBeUndefined();
    expect(await offlineNavigation("/anything", true)).toBeUndefined();
  });
  it("keeps public pages on the public homepage instead of falling back to the dashboard", async () => {
    expect(await offlineNavigation("/features")).toEqual({ page: "public-homepage" });
  });
  it("preserves the workspace shell for workspace routes", async () => {
    expect(await offlineNavigation("/app/attendance")).toEqual({ page: "school-workspace" });
  });
});
