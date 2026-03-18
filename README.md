# My HTTP MCP Server

A small Model Context Protocol (MCP) server built with:

- `@modelcontextprotocol/sdk`
- `express`
- `typescript`
- `zod`

The app exposes a Streamable HTTP MCP endpoint at `/mcp` and includes a few example tools, resources, and prompts centered around cryptocurrency data.

## Project Structure

```text
src/
  server.ts
  http/
    createMcpApp.ts
  mcp/
    createMcpServer.ts
  services/
    cryptoService.ts
```

### Responsibilities

- `src/server.ts`
  Starts the HTTP server and wires the app together.

- `src/http/createMcpApp.ts`
  Contains the HTTP and MCP transport boilerplate:
  request parsing, origin validation, session management, and `/mcp` route handling.

- `src/mcp/createMcpServer.ts`
  Defines the MCP server itself:
  tools, resources, prompts, and their schemas.

- `src/services/cryptoService.ts`
  Contains the business logic for symbol normalization, Binance API calls, and activity log access.

## Features

The server currently registers:

- Tools:
  `ping`, `add_numbers`, `get_price`, `get_price_change`

- Resources:
  `activity_log`, `crypto_price`

- Prompt:
  `executive_summary`

The crypto-related tools call Binance's public market-data endpoints and append activity to `activity.log`.

## Requirements

- Node.js 20+
- npm

Node 20+ is recommended because the app relies on the built-in `fetch` API.

## Install

```bash
npm install
```

## Run

Start the server directly from TypeScript with `tsx`:

```bash
npx tsx src/server.ts
```

By default, the server listens on:

```text
http://127.0.0.1:8787/mcp
```

You can override the port with `PORT`:

```bash
PORT=3000 npx tsx src/server.ts
```

## Build / Type Check

This repo does not currently include a `tsconfig.json` or build script, so the simplest way to validate the TypeScript sources is:

```bash
npx tsc --noEmit --module nodenext --moduleResolution nodenext --target es2022 --esModuleInterop src/server.ts src/http/createMcpApp.ts src/mcp/createMcpServer.ts src/services/cryptoService.ts
```

If you want to add a real build pipeline later, the next step would usually be:

1. Add a `tsconfig.json`
2. Add `build`, `dev`, and `typecheck` scripts to `package.json`
3. Emit compiled JavaScript into a `dist/` directory

## Testing

There is not a dedicated automated test suite yet.

Right now, the practical testing flow is:

1. Run the TypeScript check command above
2. Start the server with `npx tsx src/server.ts`
3. Connect with an MCP client and exercise the registered tools/resources/prompts

### Suggested Manual Smoke Tests

- Call `ping` and confirm it returns `pong`
- Call `add_numbers` with two values and confirm the sum
- Call `get_price` with `BTC`, `ETH`, `Bitcoin`, or `Ethereum`
- Call `get_price_change` and confirm a 24-hour summary is returned
- Read the `activity_log` resource and confirm requests are recorded
- Use the `executive_summary` prompt and confirm it references the crypto tools correctly

## Notes

- The HTTP boilerplate and session handling are intentionally separate from business logic.
- Session state is stored in memory, so this server is best suited for local development or simple demos.
- The crypto tools depend on outbound network access to Binance.
- The activity log is stored locally in `activity.log` at the project root.

## Future Improvements

- Add `tsconfig.json`
- Add npm scripts for `dev`, `build`, `typecheck`, and `test`
- Add automated tests for:
  - symbol normalization
  - Binance response handling
  - MCP tool/resource/prompt registration
  - HTTP session lifecycle
