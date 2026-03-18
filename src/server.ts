import { createMcpApp } from "./http/createMcpApp.js";
import { createMcpServer } from "./mcp/createMcpServer.js";

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "0.0.0.0";
const app = createMcpApp(createMcpServer);

/**
 * Bind to all interfaces by default so hosted platforms such as Render
 * can route traffic into the process over the provided PORT.
 *
 * For local-only development, set HOST=127.0.0.1 to restrict access.
 */
app.listen(port, host, () => {
  console.log(
    `[mcp] Streamable HTTP server listening on http://${host}:${port}/mcp`,
  );
});
