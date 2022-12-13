import { BinanceClient } from "./binanceClient"
import { MeanReversionOptions, Asset } from "./types"

/** Calculate z-score given current and historical prices for window size */
const calculateZScore = (candles: any[], currentPrice: number): number => {
    const prices = candles.map(candle => parseFloat(candle.close))
    const mean = prices.reduce((acc, e) => acc + e, 0) / prices.length
    const variance = prices.map(price => price - mean).reduce((acc, e) => acc + e ** 2, 0) / prices.length
    const standardDeviation = Math.sqrt(variance)
    
    return (currentPrice - mean) / standardDeviation
}

/** Execute mean reversion for a given asset pair */
export async function meanReversion(
    asset: Asset, 
    binanceClient: BinanceClient, 
    externalClient: any,
    opts: MeanReversionOptions
) {
    const { windowSize, zScoreThreshold, tradeWindow, logger } = opts
    const { pair, base, quote, tradeAmount } = asset

    // get latest price
    const priceResponse = await externalClient.prices({ symbol: pair })
    const price = parseFloat(priceResponse[pair]) ?? 0

    // calculate average price over reversion periods
    const candles = await externalClient.candles({ symbol: pair, interval: '5m', limit: windowSize })
    const averagePrice = candles.reduce((acc: number, e: { close: string }) => acc + parseFloat(e.close), 0) / windowSize
    const zScore = calculateZScore(candles, price)

    if (zScore < -zScoreThreshold) {
        // get balance for quote asset - this works as its always USDT at the moment on buys
        const balance = await binanceClient.getBalanceForAsset(quote)
        const amountPricedInQuote = price * tradeAmount

        // check there is enough balance to place order
        if (balance >= amountPricedInQuote) {
            const buyRequest = await binanceClient.marketOrder(pair, 'BUY', tradeAmount, tradeWindow)
            const result = binanceClient.responseHandler(buyRequest)

            if (result.isOk()) {
                const response = result.get()
                const { orderId, symbol, origQty } = response
                logger.info(`ACTION: BUY - PAIR: ${symbol} - STATUS: success - ID: ${orderId} - QUANTITY: ${origQty}`)
                return response
            }

            const error = result.getError()
            logger.error(`ACTION: BUY - PAIR: ${pair} - STATUS: failed - ERROR: ${error}`)
            return error
        }

        logger.warn(`ACTION: BUY - PAIR: ${pair} - STATUS: failed - REASON: insufficient balance`)
    } else if (zScore > zScoreThreshold) {
        // get current position on base asset - this is needed as we never own derivative asset
        const balance = await binanceClient.getCurrentPosition(pair)
        
        if (balance >= tradeAmount) {
            const sellRequest = await binanceClient.marketOrder(pair, 'SELL', tradeAmount, tradeWindow)
            const result = binanceClient.responseHandler(sellRequest)
    
            if (result.isOk()) {
                const response = result.get()
                const { orderId, symbol, origQty } = response
                logger.info(`ACTION: SELL - PAIR: ${symbol} - STATUS: success - ID: ${orderId} - QUANTITY: ${origQty}`)
                return response
            }
    
            const error = result.getError()
            logger.error(`ACTION: SELL - PAIR: ${pair} - STATUS: failed - ERROR: ${error}`)
            return error
        }

        logger.warn(`ACTION: SELL - PAIR: ${pair} - STATUS: failed - REASON: insufficient balance`)
    } else {
        logger.info(`ACTION: NONE - PAIR: ${pair} - PRICE: ${price} - AVG: ${averagePrice} - Z-SCORE: ${zScore}`)
    }
}