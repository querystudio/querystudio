import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/license")({
  server: {
    handlers: {
      GET: () => {
        return new Response(
          JSON.stringify({
            name: "QueryStudio License API",
            version: "1.0.0",
            docs: "/api/license/openapi.json",
          }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    },
  },
});
