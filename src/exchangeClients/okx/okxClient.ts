import got, { Got } from 'got'
import { createHmac } from 'node:crypto'
import { Result } from '@swan-io/boxed'
import { ExchangeClient } from '../types'
import { Candle } from '../../types'

export type HttpResponse = {
    code: string
    message: string
    data: Record<string, unknown>[]
}

interface OrderBody {
    side: string
    instId: string
    tdMode: string
    ordType: string
    sz: string
}

interface LimitOrderBody extends OrderBody {
    px: string
}

interface OrderRequest {
    id: string
    op: string
    args: OrderBody[]
}

export class OkxClient implements ExchangeClient {
    private httpClient: Got
    private baseUrl: string
    private secret: string

    constructor(baseUrl: string, secret: string, apiKey: string, passphrase: string) {
        this.httpClient = got.extend({
            headers: { 
                'OK-ACCESS-KEY': apiKey,
                'OK-ACCESS-PASSPHRASE': passphrase
            },
            throwHttpErrors: false
        })
        this.baseUrl = baseUrl
        this.secret = secret
    }

    private createSignature(timestamp: string, method: string, path: string, body: any) {
        const message = timestamp + method + path + JSON.stringify(body)
        return createHmac('sha256', this.secret).update(message).digest('base64')
    }

    private async makeSignedRequest(method: string, path: string, body: OrderRequest) {
        const timestamp = Date.now().toString()
        const signature = this.createSignature(timestamp, method, path, body)
        const url = this.baseUrl + path
        const headers = {
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-SIGN': signature
        }

        return this.httpClient(url, { headers, body: JSON.stringify(body) })
    }

    public async getTime() {
        return this.httpClient(`${this.baseUrl}/api/v5/public/time`)
    }

    /**
     * place market order
     */
    public async marketOrder(side: 'buy' | 'sell', instrumentId: string, qty: string, price: string) {
        const body = {
            side: side,
            instId: instrumentId,
            tdMode: 'cash',
            ordType: 'market',
            sz: qty
        }

        const args = {
            id: Math.random().toString(),
            op: 'sprd-order',
            args: [body]
        }

        return this.makeSignedRequest('POST', '/api/v5/trade/order', args)
    }

    /**
     * place limit order
     */
    public async limitOrder(side: 'buy' | 'sell', instrumentId: string, qty: string, price: string) {
        const body: LimitOrderBody = {
            side: side,
            instId: instrumentId,
            tdMode: 'cash',
            ordType: 'limit',
            sz: qty,
            px: price
        }

        const args = {
            id: Math.random().toString(),
            op: 'sprd-order',
            args: [body]
        }

        return this.makeSignedRequest('POST', '/api/v5/trade/order', args)
    }

    /**
     * retrieve candles for specific asset pair
     */
    public async candles(instrumentId: string, granularity: string, limit: number): Promise<Result<Candle[], any>> {
        const url = `${this.baseUrl}/api/v5/market/candles?instId=${instrumentId}&bar=${granularity}&limit=${limit}`
        const response = await this.httpClient(url)
        
        const parsed = JSON.parse(response.body)

        return this.responseHandler(parsed).map(res => {
            return res.data.map((candle: any) => ({
                    open: candle[1],
                    close: candle[4],
                    high: candle[2],
                    low: candle[3]
                })
            )
        })
    }

    /**
     * handle responses specific to OKX and return as Result type
     */
    public responseHandler(response: any): Result<any, any> {
        const { code, error } = response

        switch (code) {
            case '0':
                return Result.Ok(response)
            default:
                return Result.Error(error)
        }
    }
}