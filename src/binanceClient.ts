import got, { Got } from 'got'
import { createHmac } from 'node:crypto'
import { Result } from '@swan-io/boxed'

export class BinanceClient {
    private httpClient: Got
    private baseUrl: string
    private readonly secret: string

    constructor(baseUrl: string, secret: string, apiKey: string) {
        this.httpClient = got.extend({
            headers: { 'X-MBX-APIKEY': apiKey },
            throwHttpErrors: false
        })
        this.baseUrl = baseUrl
        this.secret = secret
    }

    /** Create HMAC signature given secret and message */
    private createHmacSig = (secret: string, query: URLSearchParams): string => {
        return createHmac('sha256', secret).update(query.toString()).digest('hex')
    }

    /** Make signed request to Binance API */
    private async makeSignedRequest(url: string, opts: any) {
        const timestamp = Date.now().toString()
    
        const { searchParams } = opts
        
        const query = new URLSearchParams({ ...searchParams, timestamp })
        const signature = this.createHmacSig(this.secret, query)
        const signedRequestOptions = { ...opts, searchParams: { ...searchParams, signature, timestamp } }
    
        return this.httpClient(url, signedRequestOptions)
    }

    /** Create a market order */
    public async marketOrder(symbol: string, side: string, quantity: number, window: number) {
        const searchParams = { symbol, side, quantity, window, type: 'MARKET' }
        return this.makeSignedRequest(`${this.baseUrl}/v1/order`, { method: 'POST', searchParams })
    }

    /** Get account balance for all assets */
    public async getAccountBalance(window: number, timestamp: string) {
        const searchParams = { window: window, timestamp: timestamp }
        return this.makeSignedRequest(`${this.baseUrl}/v2/balance`, { method: 'GET', searchParams })
    }

    /** Get account balance for specific given asset */
    public async getBalanceForAsset(asset: string): Promise<number> {
        const response = await this.getAccountBalance(5000, Date.now().toString())
        const result = this.responseHandler(response)
    
        if (result.isOk()) {
            const balances = result.get()
            const assetBalance = balances.filter((balance: Record<string, string>) => balance.asset === asset)[0]
            return parseFloat(assetBalance.balance)
        }
    
        const error = result.getError()
        console.error(`Couldn't retrieve balance for asset: ${asset} - ${error}`)
        return 0
    }

    /** Get current position amount for a given base asset - required as we never actually own a derivative asset */
    public async getCurrentPosition(pair: string): Promise<any> {
        const searchParams = { recvWindow: 5000, timestamp: Date.now().toString(), symbol: pair }
        const response = await this.makeSignedRequest(`${this.baseUrl}/v2/positionRisk`, { method: 'GET', searchParams })
        const result = this.responseHandler(response)

        if (result.isOk()) {
            const { positionAmt } = result.get()[0]
            return parseFloat(positionAmt ?? 0)
        }

        const error = result.getError()
        console.error(`Couldn't retrieve balance for asset: ${pair} - ${error}`)
        return 0
    }

    /** Handle response from http request */
    public responseHandler(response: any): Result<any, any> {
        const { statusCode, body } = response

        switch (statusCode) {
            case 200:
                return Result.Ok(JSON.parse(body))
            default:
                return Result.Error(JSON.parse(body))
        }
    }
}
