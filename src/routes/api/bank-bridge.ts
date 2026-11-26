import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/bank-bridge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getSql } = await import("@/lib/db");
        const { handleBridgePost } = await import("@/lib/masroufi/bank-bridge-handler");
        const { callerAddress } = await import("@/lib/masroufi/bank-bridge");
        // Cap the read before parsing; the handler also enforces the byte limit.
        const raw = (await request.text()).slice(0, 2048);
        const r = await handleBridgePost(await getSql(), request.headers.get("authorization"), request.headers.get("content-type"), raw, new Date(), undefined, callerAddress(request.headers, process.env.VERCEL === "1"));
        return new Response(JSON.stringify(r.body), { status: r.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
      },
    },
  },
});
