import Binance from 'binance-api-node'
import { interval, withLatestFrom, of, map, mergeMap, startWith, tap, Subscription } from 'rxjs'
import pino from 'pino'
import { BinanceClient } from './binanceClient'
import { meanReversion } from './meanReversion'
import { fibRetracement } from './fibRetracement'
import { ASSETS } from './assets'
import { bollingerBands } from './utils'
import dotenv from 'dotenv'

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

    const binanceClient = new BinanceClient(
        process.env.TEST_URL as string, 
        process.env.SECRET_KEY as string, 
        process.env.API_KEY as string
    )

    const externalClient = Binance()

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
        map(pairs => pairs.map(async pair => {
            const asset = ASSETS[pair]

            const candles = await externalClient.candles({ symbol: pair, interval: '15m', limit: WINDOW_SIZE })
            const prices = candles.map(candle => parseInt(candle.close))

            const bands = bollingerBands(prices, WINDOW_SIZE, 2)

            //const execMR = await meanReversion(asset, binanceClient, externalClient, meanReversionOpts)
            const execFR = await fibRetracement(asset, binanceClient, fibRetracementOpts, candles, bands)

            return { FR: execFR }
        })),
        mergeMap(_ => _)
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