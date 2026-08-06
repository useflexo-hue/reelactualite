import { createFileRoute } from "@tanstack/react-router";

/**
 * Relais HTTPS pour les flux radio qui ne sont diffusés qu'en HTTP
 * (bloqués par les navigateurs sur un site sécurisé).
 */
const STREAMS: Record<string, string> = {
  okapi: "http://rs1.radiostreamer.com:8000/;",
};

export const Route = createFileRoute("/api/public/radio/$station")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const upstream = STREAMS[params.station];
        if (!upstream) return new Response("Unknown station", { status: 404 });

        const res = await fetch(upstream, {
          headers: { "User-Agent": "ReelActu/1.0", Icy_MetaData: "0" },
        });
        if (!res.ok || !res.body) {
          return new Response("Stream unavailable", { status: 502 });
        }
        return new Response(res.body, {
          status: 200,
          headers: {
            "Content-Type": res.headers.get("content-type") ?? "audio/mpeg",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
