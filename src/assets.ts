import { AssetConfig } from './types'

/** Asset configuration */
export const ASSETS: AssetConfig = {
    'BTC-USDT': {
        pair: 'BTC-USDT',
        base: 'BTC',
        quote: 'USDT',
        tradeAmount: 0.1
    },
    'ETH-USDT': {
        pair: 'ETH-USDT',
        base: 'ETH',
        quote: 'USDT',
        tradeAmount: 0.4
    },
    'XRP-USDT': {
        pair: 'XRP-USDT',
        base: 'XRP',
        quote: 'USDT',
        tradeAmount: 100
    },
    'ADA-USDT': {
        pair: 'ADA-USDT',
        base: 'ADA',
        quote: 'USDT',
        tradeAmount: 100
    },
    'BNB-USDT': {
        pair: 'BNB-USDT',
        base: 'BNB',
        quote: 'USDT',
        tradeAmount: 1
    }
}