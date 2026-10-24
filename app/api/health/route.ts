// Build marker for the post-deploy smoke test (scripts/deploy-smoke.sh): which commit this
// deployment runs. Vercel sets VERCEL_GIT_COMMIT_SHA on Git deployments only. No I/O, never cached.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "content-knowledgehub-web",
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
