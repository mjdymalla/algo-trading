import { AssetConfig } from './types'

/** Asset configuration */
export const ASSETS: AssetConfig = {
    'BTCUSDT': {
        pair: 'BTCUSDT',
        base: 'BTC',
        quote: 'USDT',
        tradeAmount: 0.1
    },
    'ETHUSDT': {
        pair: 'ETHUSDT',
        base: 'ETH',
        quote: 'USDT',
        tradeAmount: 0.4
    },
    'XRPUSDT': {
        pair: 'XRPUSDT',
        base: 'XRP',
        quote: 'USDT',
        tradeAmount: 100
    },
    'ADAUSDT': {
        pair: 'ADAUSDT',
        base: 'ADA',
        quote: 'USDT',
        tradeAmount: 100
    },
    'BNBUSDT': {
        pair: 'BNBUSDT',
        base: 'BNB',
        quote: 'USDT',
        tradeAmount: 1
    }
}