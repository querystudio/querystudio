import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { env } from "./env.ts";
import { licenseRoutes } from "./routes/license.ts";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: "*", // Configure this for production
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.get("/health", (c) => {
  return c.json({ status: "healthy" });
});

app.route("/api/license", licenseRoutes);

app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    {
      error: "Internal server error",
      message: env.NODE_ENV === "development" ? err.message : undefined,
    },
    500,
  );
});

// Start server
console.log(`Starting server on port ${env.PORT}...`);
console.log(`Environment: ${env.NODE_ENV}`);

export default {
  port: env.PORT,
  fetch: app.fetch,
};
