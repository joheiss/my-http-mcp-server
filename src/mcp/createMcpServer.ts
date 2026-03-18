import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getPriceChangeForSymbol,
  getPriceForSymbol,
  getSymbolFromName,
  readActivityLog,
} from "../services/cryptoService.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "example-streamable-http-server",
    version: "1.0.0",
  });

  const cryptoSymbolSchema = z
    .string()
    .trim()
    .min(2)
    .describe("Crypto symbol or name (for example BTC, ETH, Bitcoin, Ethereum)");

  server.registerTool(
    "ping",
    {
      title: "Ping",
      description: "Simple health-check tool that returns pong.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async () => ({
      content: [{ type: "text", text: "pong" }],
    }),
  );

  server.registerTool(
    "add_numbers",
    {
      title: "Add Numbers",
      description: "Add two numbers together.",
      inputSchema: {
        a: z.number().describe("First number"),
        b: z.number().describe("Second number"),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ a, b }) => ({
      content: [{ type: "text", text: `${a} + ${b} = ${a + b}` }],
    }),
  );

  server.registerTool(
    "get_price",
    {
      title: "Get Crypto Price",
      description: "Get the latest spot price for a cryptocurrency from Binance.",
      inputSchema: {
        symbol: cryptoSymbolSchema,
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ symbol }) => getPriceForSymbol(symbol),
  );

  server.registerTool(
    "get_price_change",
    {
      title: "Get 24h Price Change",
      description:
        "Get 24-hour price statistics for a cryptocurrency from Binance.",
      inputSchema: {
        symbol: cryptoSymbolSchema,
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ symbol }) => getPriceChangeForSymbol(symbol),
  );

  server.registerResource(
    "activity_log",
    "file://my-mcp-server/activity.log",
    {
      title: "Activity Log",
      description: "Server activity log file for crypto price lookups.",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [
        {
          uri: "file://my-mcp-server/activity.log",
          text: readActivityLog(),
          mimeType: "text/plain",
        },
      ],
    }),
  );

  server.registerResource(
    "crypto_price",
    new ResourceTemplate("resource://crypto_price/{symbol}", {
      list: undefined,
    }),
    {
      title: "Crypto Price Resource",
      description: "Fetch the latest price for a cryptocurrency as a resource.",
      mimeType: "text/plain",
    },
    async (_uri, variables) => {
      const symbol = String(variables.symbol ?? "");
      const result = await getPriceForSymbol(symbol);

      return {
        contents: [
          {
            uri: `resource://crypto_price/${getSymbolFromName(symbol)}`,
            text: result.content[0].text,
            mimeType: "text/plain",
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "executive_summary",
    {
      title: "Crypto Executive Summary",
      description:
        "Generate a short executive summary using current crypto prices and 24-hour changes.",
      argsSchema: {
        crypto: z
          .string()
          .trim()
          .optional()
          .describe(
            "Comma-separated crypto names or symbols to analyze (defaults to Bitcoin and Ethereum)",
          ),
      },
    },
    async ({ crypto }) => {
      const requestedAssets = crypto?.trim() || "Bitcoin and Ethereum";

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: [
                `Provide the current prices for ${requestedAssets} and summarize their 24-hour movement.`,
                "",
                "Use `get_price` and `get_price_change` for each requested asset.",
                "Normalize names to exchange symbols before calling the tools when needed.",
                "Finish with a short executive summary of overall crypto market sentiment.",
              ].join("\n"),
            },
          },
        ],
      };
    },
  );

  return server;
}
