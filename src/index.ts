import Binance from 'binance-api-node'
import { interval, withLatestFrom, of, map, startWith } from 'rxjs'
import pino from 'pino'
import { BinanceClient } from './binanceClient'
import { meanReversion } from './meanReversion'
import { ASSETS } from './assets'
import dotenv from 'dotenv'

/** 5 minute interval */
const ACTION_INTERVAL = 300000
/** Depth of candle array (20 candles) */
const WINDOW_SIZE = 20
const Z_SCORE_THRESHOLD = 1.5
const TRADE_WINDOW = 5000

export function init() {
    dotenv.config()

    const logger = pino({ transport: { target: 'pino-pretty' } })

    const binanceClient = new BinanceClient(
        process.env.TEST_URL as string, 
        process.env.SECRET_KEY as string, 
        process.env.API_KEY as string
    )
    const externalClient = Binance()

    logger.info(`Initialising service with assets: ${Object.keys(ASSETS)}`)

    const runAtInterval = interval(ACTION_INTERVAL).pipe(
        startWith(0),
        withLatestFrom(of(Object.keys(ASSETS))),
        map(x => x[1]),
        map(pairs => pairs.map(pair => {
            const asset = ASSETS[pair]

            const opts = { 
                windowSize: WINDOW_SIZE, 
                zScoreThreshold: Z_SCORE_THRESHOLD, 
                tradeWindow: TRADE_WINDOW, 
                logger: logger 
            }

            return meanReversion(asset, binanceClient, externalClient, opts)
        }))
    )

    runAtInterval.subscribe()
}

init()
