
/**
 * Calculates the Bollinger Bands for a given list of prices, specified period and deviation.
 * 
 * @param prices - An array of numerical values representing the prices of an asset over a period of time.
 * @param period - The number of data points to be used for the calculation of the Bollinger Bands.
 * @param deviation - The number of standard deviations to be used for the calculation of the upper and lower bands.
 * @returns - A two-dimensional array of numerical values, with the first element being the moving average, 
 *            second the upper band and third the lower band.
 */
export const bollingerBands = (prices: number[], period: number, deviation: number): number[][] => {
    const movingAvg = movingAverage(prices, period)
    const stdDev = standardDeviation(prices, period, movingAvg)
    const upperBand = movingAvg.map((x, i) => x + deviation * stdDev[i])
    const lowerBand = movingAvg.map((x, i) => x - deviation * stdDev[i])
    return [movingAvg, upperBand, lowerBand]
}

/**
 * Calculates a moving average value based on the latest prices from inside
 * the 'period' or 'window'. If prices contain 50 values, we only want an
 * average of the last n prices (where n = period)
 * 
 * @param prices - prices for an assets over a period of time
 * @param period - period or window to use to limit which prices are used
 * @returns - moving average based on current prices
 */
const movingAverage = (prices: number[], period: number): number[] => {
    let movingAverage = []

    for (let i = period - 1; i < prices.length; i++) {
        let sum = 0

        for (let j = i - period + 1; j <= i; j++) sum += prices[j]

        movingAverage.push(sum / period)
    }

    return movingAverage
}

/**
 * Calculates the Standard Deviation for a given list of prices and a specified period.
 * 
 * @param prices - An array of numerical values representing the prices of an asset over a period of time.
 * @param period - The number of data points to be used for the calculation of the Standard Deviation.
 * @returns - An array of numerical values representing the Standard Deviation for each window of the specified period.
 */
const standardDeviation = (prices: number[], period: number, movingAverage: number[]): number[] => {
    let standardDeviation = []

    for (let i = period - 1; i < prices.length; i++) {
        let sum = 0

        for (let j = i - period + 1; j <= i; j++) {
            sum += (prices[j] - movingAverage[i - period + 1]) ** 2
        }

        standardDeviation.push(Math.sqrt(sum / period))
    }

    return standardDeviation
}