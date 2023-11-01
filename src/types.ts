import { Logger } from "pino"

export interface Asset {
    pair: string,
    base: string,
    quote: string,
    tradeAmount: number
}

export interface AssetConfig {
    [symbol: string]: Asset
}

export interface MeanReversionOptions {
    windowSize: number,
    zScoreThreshold: number,
    tradeWindow: number,
    logger: Logger
}

export interface Candle {
    open: string
    close: string
    high: string
    low: string
}