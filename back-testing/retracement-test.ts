
import fs from 'fs'
import csv from 'csv-parser'
import path from 'path'
import { Observable, bufferCount, finalize, map } from 'rxjs'
import pino from 'pino'

const LEVELS = [0, 0.5, 0.618, 1]

const logger = pino({ transport: { target: 'pino-pretty' } })

/** Calculate retracement levels for current window */
const calculateRetracement = (high: number, low: number, levels: number[]) => levels.map(level => low + (high - low) * level)

/** Check current trend in relation to retracement levels */
const checkTrend = (close: number, open: number, levels: any) => {
    const delta = open - close;
    const position = delta >= 0 ? 'support' : 'resistance'

    switch (position) {
        case 'support': {
            return close < levels[1] ? 'buy' : 'range-bound'
        }
        case 'resistance': {
            return close > levels[2] ? 'sell' : 'range-bound'
        }
        default:
            return 'range-bound'
    }
}

// Initialize balance and holding to 0
let baseHolding = 0
let quoteHolding = 10000

const baseTradeAmount = 1000
const quoteTradeAmount = 500

let currentClose: number

// Initialize arrays to keep track of trades and P&L
const trades: { type: 'SELL' | 'BUY', price: number, amount: number }[] = []
const pnl: number[] = []

let prevCandle: 'red' | 'green' | 'neutral' = 'red'

const runRetracementTest = (base: string, quote: string, filePath: string): Observable<void> => {
    return new Observable(observer => {
        fs.createReadStream(path.join(__dirname, filePath))
            .pipe(csv())
            .on('data', (row) => {
                observer.next(row)
            })
            .on('end', () => {
                console.info('Stream complete...')
                observer.complete()
            })
    }).pipe(
        map(row => {
            const { _3: open, _4: high, _5: low, _6: close } = row as Record<string, string>
            return { open, high, low, close }
        }),
        bufferCount(10),
        map(event => {
            const high = Math.max(...event.map(candle => parseFloat(candle.high)))
            const low = Math.min(...event.map(candle => parseFloat(candle.low)))
            const retracementLevels = calculateRetracement(high, low, LEVELS)
            const close = parseFloat(event[event.length - 1].close)
            const open = parseFloat(event[0].open)
    
            // Check trend and execute trade if necessary
            switch (checkTrend(close, open, retracementLevels)) { 
                case 'buy': {
                    const amountInBase = quoteTradeAmount / close
    
                    if (quoteHolding >= quoteTradeAmount) {
                        quoteHolding -= quoteTradeAmount
                        baseHolding += amountInBase
                        logger.info(`BUY - BASE AMOUNT: ${amountInBase} - QUOTE HOLDING ${quoteHolding} - BASE HOLDING ${baseHolding} - RATE: ${close}`)
                    }
                }
                case 'sell': {
                    const amountInQuote = baseTradeAmount * close
    
                    if (baseHolding >= baseTradeAmount) {
                        baseHolding -= baseTradeAmount
                        quoteHolding += amountInQuote
                        logger.info(`SELL - BASE AMOUNT: ${amountInQuote} - QUOTE HOLDING ${quoteHolding} - BASE HOLDING ${baseHolding} - RATE: ${close}`)
                    }
                }
                default: {
                    logger.info(`NO ACTION`)
                }
            }
    
            currentClose = close
        }),
        finalize(() => {
            // close base position 
            if (baseHolding > 0) {
                const amount = baseHolding / currentClose
                logger.info(`CLOSING POSITION - QUOTE: ${quoteHolding.toFixed(2)} - BASE: ${baseHolding.toFixed(2)} - CLOSE: ${currentClose.toFixed(2)} - TAKE: ${amount.toFixed(2)}`)
                quoteHolding += (baseHolding / currentClose)
            }
    
            logger.info(`FINAL HOLDINGS IN QUOTE CURRENCY: ${quoteHolding.toFixed(2)}`)
        })
    )
}

const results = {}

runRetracementTest('XRP', 'BUSD', './binance-XRPBUSD.csv').subscribe()
