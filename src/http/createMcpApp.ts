import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, {
  type ErrorRequestHandler,
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

type SessionContext = {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
};

type JsonRpcErrorResponse = {
  jsonrpc: "2.0";
  error: {
    code: number;
    message: string;
  };
  id: string | number | null;
};

const allowedOrigins = new Set<string>([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

export function createMcpApp(
  createServer: () => McpServer,
): Express {
  const sessions = new Map<string, SessionContext>();
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use(validateOrigin);
  app.use((req, _res, next) => {
    console.log(`[http] ${req.method} ${req.path}`);
    next();
  });
  app.use(jsonErrorHandler);

  app.all("/mcp", async (req: Request, res: Response) => {
    try {
      if (req.method === "POST") {
        await handlePostRequest(req, res, sessions, createServer);
        return;
      }

      if (req.method === "GET") {
        await handleGetRequest(req, res, sessions);
        return;
      }

      if (req.method === "DELETE") {
        await handleDeleteRequest(req, res, sessions);
        return;
      }

      res.setHeader("Allow", "GET, POST, DELETE");
      res.status(405).send("Method not allowed.");
    } catch (error) {
      console.error("[mcp] unhandled error:", error);
      if (!res.headersSent) {
        sendJsonRpcError(
          res,
          500,
          -32603,
          "Internal server error",
          getRequestId(req),
        );
      }
    }
  });

  return app;
}

function sendJsonRpcError(
  res: Response,
  status: number,
  code: number,
  message: string,
  id: JsonRpcErrorResponse["id"] = null,
) {
  res.status(status).json({
    jsonrpc: "2.0",
    error: {
      code,
      message,
    },
    id,
  } satisfies JsonRpcErrorResponse);
}

function validateOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.header("origin");

  if (!origin) {
    next();
    return;
  }

  if (!allowedOrigins.has(origin)) {
    sendJsonRpcError(res, 403, -32000, `Forbidden origin: ${origin}`);
    return;
  }

  next();
}

const jsonErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (
    error instanceof SyntaxError &&
    "status" in error &&
    error.status === 400 &&
    "body" in error
  ) {
    sendJsonRpcError(res, 400, -32700, "Parse error");
    return;
  }

  next(error);
};

function getSessionId(req: Request): string | undefined {
  return req.header("mcp-session-id") ?? undefined;
}

function getRequestId(req: Request): JsonRpcErrorResponse["id"] {
  const id = req.body?.id;

  if (typeof id === "string" || typeof id === "number" || id === null) {
    return id;
  }

  return null;
}

function isJsonRpcRequestBody(body: unknown): body is {
  method?: unknown;
} {
  return !!body && typeof body === "object" && !Array.isArray(body);
}

function isInitializeRequest(req: Request): boolean {
  return isJsonRpcRequestBody(req.body) && req.body.method === "initialize";
}

async function createSession(
  sessions: Map<string, SessionContext>,
  createServer: () => McpServer,
): Promise<SessionContext> {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId: string) => {
      console.log(`[mcp] session initialized: ${sessionId}`);
    },
    onsessionclosed: (sessionId: string) => {
      console.log(`[mcp] session closed: ${sessionId}`);
      sessions.delete(sessionId);
    },
    enableJsonResponse: true,
  });

  await server.connect(transport);

  return { server, transport };
}

async function disposeSession(ctx: SessionContext) {
  await ctx.server.close();
}

async function handlePostRequest(
  req: Request,
  res: Response,
  sessions: Map<string, SessionContext>,
  createServer: () => McpServer,
) {
  const sessionId = getSessionId(req);

  if (isInitializeRequest(req)) {
    const ctx = await createSession(sessions, createServer);

    try {
      await ctx.transport.handleRequest(req, res, req.body);

      const createdSessionId = ctx.transport.sessionId;
      if (!createdSessionId) {
        await disposeSession(ctx);

        if (!res.headersSent) {
          sendJsonRpcError(
            res,
            500,
            -32603,
            "Session initialization did not produce a session id.",
            getRequestId(req),
          );
        }
        return;
      }

      sessions.set(createdSessionId, ctx);
      return;
    } catch (error) {
      await disposeSession(ctx);
      throw error;
    }
  }

  if (!sessionId) {
    sendJsonRpcError(
      res,
      400,
      -32000,
      "Missing Mcp-Session-Id header for non-initialize request.",
      getRequestId(req),
    );
    return;
  }

  const ctx = sessions.get(sessionId);
  if (!ctx) {
    sendJsonRpcError(
      res,
      404,
      -32001,
      "Session not found or expired.",
      getRequestId(req),
    );
    return;
  }

  await ctx.transport.handleRequest(req, res, req.body);
}

async function handleGetRequest(
  req: Request,
  res: Response,
  sessions: Map<string, SessionContext>,
) {
  const sessionId = getSessionId(req);

  if (!sessionId) {
    sendJsonRpcError(res, 400, -32000, "Missing Mcp-Session-Id header.");
    return;
  }

  const ctx = sessions.get(sessionId);
  if (!ctx) {
    sendJsonRpcError(res, 404, -32001, "Session not found.");
    return;
  }

  await ctx.transport.handleRequest(req, res);
}

async function handleDeleteRequest(
  req: Request,
  res: Response,
  sessions: Map<string, SessionContext>,
) {
  const sessionId = getSessionId(req);

  if (!sessionId) {
    sendJsonRpcError(res, 400, -32000, "Missing Mcp-Session-Id header.");
    return;
  }

  const ctx = sessions.get(sessionId);
  if (!ctx) {
    sendJsonRpcError(res, 404, -32001, "Session not found.");
    return;
  }

  await ctx.transport.handleRequest(req, res);
}
