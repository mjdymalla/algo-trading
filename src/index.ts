import Binance from 'binance-api-node'
import { interval, withLatestFrom, of, map, mergeMap, startWith, tap, Subscription, switchMap } from 'rxjs'
import pino from 'pino'
import { BinanceClient } from './exchangeClients/binanceClient'
import { meanReversion } from './meanReversion'
import { fibRetracement } from './fibRetracement'
import { ASSETS } from './assets'
import { bollingerBands } from './utils'
import dotenv from 'dotenv'
import { OkxClient } from './exchangeClients/okx/okxClient'
import { closingPriceForPeriod } from './exchangeClients/okx/utils'
import { Result } from '@swan-io/boxed'

/** 5 minute interval */
const ACTION_INTERVAL = 300_000
//const ACTION_INTERVAL = 10_000
/** Depth of candle array (20 candles) */
const WINDOW_SIZE = 20
const Z_SCORE_THRESHOLD = 1.5
const TRADE_WINDOW = 5000

const logger = pino({ transport: { target: 'pino-pretty' } })

export function init(): Subscription {
    dotenv.config()

    const okxClient = new OkxClient(
        process.env.OKX_URL as string,
        process.env.OKX_SECRET as string,
        process.env.OKX_API_KEY as string,
        process.env.OKX_PASSPHRASE as string
    )

    const meanReversionOpts = { 
        windowSize: WINDOW_SIZE, 
        zScoreThreshold: Z_SCORE_THRESHOLD, 
        tradeWindow: TRADE_WINDOW, 
        logger: logger 
    }

    const fibRetracementOpts = {
        windowSize: WINDOW_SIZE,
        logger: logger
    }

    logger.info(`Initialising service with assets: ${Object.keys(ASSETS)}`)

    const runAtInterval = interval(ACTION_INTERVAL).pipe(
        startWith(0),
        withLatestFrom(of(Object.keys(ASSETS))),
        map(x => x[1]),
        switchMap(pairs => pairs.map(async pair => {
            const asset = ASSETS[pair]

            const quarterCandles = await okxClient.candles(pair, '5m', WINDOW_SIZE)
            const halfCandles = await okxClient.candles(pair, '15m', WINDOW_SIZE)
            const hourCandles = await okxClient.candles(pair, '30m', WINDOW_SIZE)

            const result = Result.allFromDict({
                quarter: quarterCandles,
                half: halfCandles,
                hour: hourCandles
            })

            if (result.isError()) throw result.getError()

            const { quarter, half, hour } = result.get()

            const quarterPrices = quarter.map(candle => parseInt(candle.close))
            const halfPrices = half.map(candle => parseInt(candle.close))
            const hourPrices = hour.map(candle => parseInt(candle.close))

            const bands = {
                quarterBands: bollingerBands(quarterPrices, WINDOW_SIZE, 2),
                halfBands: bollingerBands(halfPrices, WINDOW_SIZE, 2),
                hourBands: bollingerBands(hourPrices, WINDOW_SIZE, 2)
            }

            // //const execMR = await meanReversion(asset, binanceClient, externalClient, meanReversionOpts)
            const execFR = await fibRetracement(asset, okxClient, fibRetracementOpts, quarter, bands)

            return { FR: execFR }
        })),
        switchMap(_ => _)
    )

    return runAtInterval.subscribe()
}

const runtime = init()

for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
    process.once(signal, () => {
        logger.info('Cleaning up resources and exiting service...')
        runtime.unsubscribe()
        process.exit(0)
    })
}