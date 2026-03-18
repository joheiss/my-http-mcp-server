import { createMcpApp } from "./http/createMcpApp.js";
import { createMcpServer } from "./mcp/createMcpServer.js";

const port = Number(process.env.PORT ?? 8787);
const app = createMcpApp(createMcpServer);

/**
 * Bind to localhost by default.
 *
 * For local MCP servers this is the safer default and aligns with the MCP
 * transport security guidance.
 */
app.listen(port, "localhost", () => {
  console.log(
    `[mcp] Streamable HTTP server listening on http://localhost:${port}/mcp`,
  );
});
