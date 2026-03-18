import fs from "fs";
import path from "path";

export const ACTIVITY_LOG_FILE = path.join(__dirname, "../activity.log");

export type TextToolResult = {
  content: [
    {
      type: "text";
      text: string;
    },
  ];
};

type BinancePriceResponse = {
  price: string;
};

type Binance24hrTickerResponse = {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
};

export function getSymbolFromName(name: string): string {
  if (["bitcoin", "btc"].includes(name.toLowerCase())) {
    return "BTCUSDT";
  }

  if (["ethereum", "eth"].includes(name.toLowerCase())) {
    return "ETHUSDT";
  }

  return name.toUpperCase();
}

function appendActivityLog(message: string) {
  fs.appendFileSync(ACTIVITY_LOG_FILE, `${message}\n`);
}

export function readActivityLog(): string {
  if (!fs.existsSync(ACTIVITY_LOG_FILE)) {
    return "";
  }

  return fs.readFileSync(ACTIVITY_LOG_FILE, "utf-8");
}

export async function getPriceForSymbol(
  symbol: string,
): Promise<TextToolResult> {
  const resolvedSymbol = getSymbolFromName(symbol);
  const url = `https://data-api.binance.vision/api/v3/ticker/price?symbol=${resolvedSymbol}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    appendActivityLog(
      `Error getting price for ${resolvedSymbol}: ${response.status} ${errorText}`,
    );
    throw new Error(
      `Error getting price for ${resolvedSymbol}: ${response.status} ${errorText}`,
    );
  }

  const data = (await response.json()) as BinancePriceResponse;
  appendActivityLog(
    `Successfully got price for ${resolvedSymbol}. Current price is ${data.price}. Current time is ${new Date().toISOString()}`,
  );

  return {
    content: [
      {
        type: "text",
        text: `The current price of ${resolvedSymbol} is ${data.price}`,
      },
    ],
  };
}

export async function getPriceChangeForSymbol(
  symbol: string,
): Promise<TextToolResult> {
  const resolvedSymbol = getSymbolFromName(symbol);
  const url = `https://data-api.binance.vision/api/v3/ticker/24hr?symbol=${resolvedSymbol}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    appendActivityLog(
      `Error getting 24h price change for ${resolvedSymbol}: ${response.status} ${errorText}`,
    );
    throw new Error(
      `Error getting 24h price change for ${resolvedSymbol}: ${response.status} ${errorText}`,
    );
  }

  const data = (await response.json()) as Binance24hrTickerResponse;
  const summary = [
    `${data.symbol} last price: ${data.lastPrice}`,
    `24h change: ${data.priceChange} (${data.priceChangePercent}%)`,
    `24h range: ${data.lowPrice} - ${data.highPrice}`,
    `24h volume: ${data.volume}`,
  ].join(", ");

  appendActivityLog(
    `Successfully got 24h price change for ${resolvedSymbol}. ${summary}. Current time is ${new Date().toISOString()}`,
  );

  return {
    content: [
      {
        type: "text",
        text: summary,
      },
    ],
  };
}
