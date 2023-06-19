import { CandleChartResult } from "binance-api-node"
import { BinanceClient } from "./binanceClient"
import { Asset } from "./types"

const LEVELS = [0, 0.5, 0.618, 1]

/** Calculate retracement levels for current window */
const calculateRetracement = (candles: CandleChartResult[], levels: number[]): number[] => {
    const high = Math.max(...candles.map(candle => parseInt(candle.high)))
    const low = Math.min(...candles.map(candle => parseInt(candle.low)))

    return levels.map(level => low + (high - low) * level)
}

/** Check current trend in relation to retracement levels */
const checkTrend = (candles: CandleChartResult[], levels: number[]): 'buy' | 'sell' | 'range-bound' => {
    const closingPrice = parseInt(candles[candles.length - 1].close)
    const openingPrice = parseInt(candles[0].close)
    const delta = openingPrice - closingPrice
    const position = delta >= 0 ? 'support' : 'resistance'

    switch (position) {
        case 'support': {
            return closingPrice < levels[1] ? 'buy' : 'range-bound' 
        }
        case 'resistance': {
            return closingPrice > levels[2] ? 'sell' : 'range-bound'
        }
        default:
            return 'range-bound'
    }
}

// track the previous candles signal
let prevCandle: 'red' | 'green' | 'neutral' = 'red'

export async function fibRetracement(
    asset: Asset, 
    binanceClient: BinanceClient, 
    opts: any,
    candles: CandleChartResult[],
    bands: number[][]
) {
    const { windowSize, logger } = opts
    const { pair, tradeAmount } = asset

    const retracementLevels = calculateRetracement(candles, LEVELS)
    const currentClose = candles[candles.length - 1].close

    const [upperBand, lowerBand] = bands

    switch (checkTrend(candles, retracementLevels)) {
        case 'sell': {
            const current = parseInt(currentClose)

            if (current > upperBand[windowSize - 1]) {
                prevCandle = 'neutral'
                return await handleSell(binanceClient, pair, tradeAmount, currentClose, logger)
            } else if (current < upperBand[windowSize - 1] && current >= lowerBand[windowSize - 1]) {
                if (prevCandle === 'red') return await handleSell(binanceClient, pair, tradeAmount, currentClose, logger)
                prevCandle = 'red'
                return null
            }

            prevCandle = 'neutral'
        }
        case 'buy': {
            const current = parseInt(currentClose)

            // current price is below lower band is strong buy sign
            if (current <= lowerBand[windowSize - 1]) {
                prevCandle = 'neutral'
                return await handleBuy(binanceClient, pair, tradeAmount, currentClose, logger)
            } else if (current > lowerBand[windowSize - 1] && current <= upperBand[windowSize - 1]) {
                if (prevCandle === 'green') return await handleBuy(binanceClient, pair, tradeAmount, currentClose, logger)
                prevCandle = 'green'
                return null
            } 

            prevCandle = 'neutral'
        }
        default:
            logger.info(`ACTION: NONE - PAIR: ${pair} - PRICE: ${currentClose} - REASON: range-bound`)
    }
}

/** Handle request on limit buy */
const handleBuy = async (binanceClient: BinanceClient, pair: string, amount: number, price: string, logger: any) => {
    const buyRequest = await binanceClient.limitOrder(pair, 'BUY', amount, price, 'GTC')
    const result = binanceClient.responseHandler(buyRequest)

    if (result.isOk()) {
        const response = result.get()
        logger.info(`ACTION: LIMIT BUY - PAIR: ${pair} - STATUS: placed - PRICE: ${price} - QUANTITY: ${amount}`)
        return response
    }

    const error = result.getError()
    logger.error(`ACTION: LIMIT BUY - PAIR: ${pair} - STATUS: failed - ERROR: ${error}`)
    return error
}

/** Handle request on limit sell */
const handleSell = async (binanceClient: BinanceClient, pair: string, amount: number, price: string, logger: any) => {
    const sellRequest = await binanceClient.limitOrder(pair, 'SELL', amount, price, 'GTC')
    const result = binanceClient.responseHandler(sellRequest)

    if (result.isOk()) {
        const response = result.get()
        logger.info(`ACTION: LIMIT SELL - PAIR: ${pair} - STATUS: placed - PRICE: ${price} - QUANTITY: ${amount}`)
        return response
    }

    const error = result.getError()
    logger.error(`ACTION: LIMIT SELL - PAIR: ${pair} - STATUS: failed - ERROR: ${error}`)
    return error
}