export interface ExchangeClient {
    marketOrder(...args: any[]): any

    limitOrder(...args: any[]): any

    responseHandler(...args: any[]): any
}