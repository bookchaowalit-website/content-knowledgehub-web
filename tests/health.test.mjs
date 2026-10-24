import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GET, dynamic } from "../app/api/health/route.ts";

describe("GET /api/health", () => {
  it("answers 200 with a JSON status", async () => {
    const response = GET();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /application\/json/);
    const body = await response.json();
    assert.equal(body.status, "ok");
    assert.equal(body.service, "content-knowledgehub-web");
  });

  it("is never cached, so it reflects the running deployment", () => {
    assert.equal(dynamic, "force-dynamic");
    assert.equal(GET().headers.get("cache-control"), "no-store");
  });

  it("reports the short commit of a Git deployment, and null otherwise", async () => {
    const previous = process.env.VERCEL_GIT_COMMIT_SHA;
    try {
      process.env.VERCEL_GIT_COMMIT_SHA = "4c55e9b8de1e83fb44bdc77aaf33d5a74adf589f";
      assert.equal((await GET().json()).commit, "4c55e9b");
      process.env.VERCEL_GIT_COMMIT_SHA = ""; // CLI deployments carry no commit
      assert.equal((await GET().json()).commit, null);
      delete process.env.VERCEL_GIT_COMMIT_SHA;
      assert.equal((await GET().json()).commit, null);
    } finally {
      if (previous === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA;
      else process.env.VERCEL_GIT_COMMIT_SHA = previous;
    }
  });
});
