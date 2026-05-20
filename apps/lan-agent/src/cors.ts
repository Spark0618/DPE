import type { FastifyInstance } from "fastify";

/** Allow browser clients (Vite :5173) to call lan-agent REST APIs. */
export async function registerCors(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", async (req, reply) => {
    const origin = req.headers.origin;
    if (origin) {
      reply.header("Access-Control-Allow-Origin", origin);
      reply.header("Vary", "Origin");
    } else {
      reply.header("Access-Control-Allow-Origin", "*");
    }
    reply.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      return reply.status(204).send();
    }
  });
}
