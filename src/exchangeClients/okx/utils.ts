import { OkxClient } from "./okxClient";

/**
 * get closing prices for a given period
 * @param client exchange client
 * @param period time period
 * @param pair asset pair
 * @param window window size
 * @returns array of closing prices for given pair
 */
export const closingPriceForPeriod = async (
    client: OkxClient, 
    period: string, 
    pair: string, 
    window: number
): Promise<{ open: number, close: number}[]> => {
    // const candles = await client.candles(pair, period, window)

    // const result = candles.map(candle => {
    //     const open = parseInt(candle.open)
    //     const close = parseInt(candle.close)

    //     return { open, close }
    // })

    // if (result.isError()) throw result.getError()

    // const prices = result.get()

    // return prices as any
    return 1 as any
}