const Utility = require('../utility/Utility');
const https = require('https');
const Logger = require('../utility/Logger');

class TDDataService{
    constructor(){
        this.TD_Option_URL = '/v1/marketdata/chains';
        this.apiKey = 'HI4XLAM9UUKXN6OSCM5SWNHSNT73DJ9G';
        this.hostName = 'api.tdameritrade.com';
        this.requestHeader = {
            'Content-Type': 'application/json'
        };
        this.quoteParam = {
            frequencyType: 'daily',
            frequency: 1,
            needExtendedHoursData: false
        };
        this.requestTimeout = 3000;
    }

    getFundamental(ticker) {
        const requestPath = this.#getFundamentalRequestPath(ticker);
        return new Promise((resolve, reject) => {
            https.get({
                hostname: this.hostName,
                path: requestPath,
                headers: this.requestHeader
            }, res => {
                res.setEncoding('utf8');
                let body = ''; 
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    resolve(JSON.parse(body))
                });
            }).on('error', reject);
        });
    }
    
    getRealtimeQuote(ticker) {
        const requestPath = `/v1/marketdata/${ticker}/quotes?apikey=${this.apiKey}`;
        return this.#requestJSON(ticker, requestPath);
    }

    getRealTimeQuotes(tickers) {
        let tickersParam = tickers.join('%2C');
        const requestPath = `/v1/marketdata/quotes?apikey=${this.apiKey}&symbol=${tickersParam}`;
        return this.#requestJSON(tickers.join(','), requestPath);
    }

    getDailyPriceHistory(ticker, periodType='month', period=3) {
        const requestPath = this.#getPriceHistoryRequestPath(ticker, periodType, period);
        return this.#requestJSON(ticker, requestPath);
    }

    #getFundamentalRequestPath(ticker) {
        return `/v1/instruments?apikey=${this.apiKey}&symbol=${ticker}&projection=fundamental`;
    }

    #getPriceHistoryRequestPath(ticker, periodType, period){        
        const params = `apikey=${this.apiKey}&periodType=${periodType}&period=${period}&frequencyType=${this.quoteParam.frequencyType}&frequency=${this.quoteParam.frequency}&needExtendedHoursData=${this.quoteParam.needExtendedHoursData}`;
        return  `/v1/marketdata/${ticker}/pricehistory?${params}`;
    }

    #getCallOptionChainRequestPath(ticker){
        return this.#getOptionChainRequestPath(ticker, Utility.CALL_OPTION, 'SINGLE');
    }

    #getPutOptionChainRequestPath(ticker){
        return this.#getOptionChainRequestPath(ticker, Utility.PUT_OPTION, 'SINGLE');
    }

    #getOptionChainRequestPath(ticker, contractType, strategy){
        const params = `apikey=${this.apiKey}&symbol=${ticker}&contractType=${contractType}&strategy=${strategy}&includeQuotes=TRUE`;
        return  `${this.TD_Option_URL}?${params}`;
    }

    requestOptionChain(ticker, optionType) {
        let requestPath = Utility.isCall(optionType) ? 
            this.#getCallOptionChainRequestPath(ticker) : this.#getPutOptionChainRequestPath(ticker);;
        return this.#requestJSON(ticker, requestPath);
    }

    #requestJSON(ticker, requestPath) {
        return new Promise((resolve, reject) => {
            https.get({
                hostname: this.hostName,
                path: requestPath,
                timeout: this.requestTimeout,
                headers: this.requestHeader
            }, res => {
                res.setEncoding('utf8');
                let body = ''; 
                res.on('data', chunk => body += chunk);
                res.on('end', () => { 
                    let jsonObj;
                    try {
                        jsonObj = JSON.parse(body);
                    } catch (error) {
                        Logger.logError({
                            'ticker': ticker,
                            'requestPath': requestPath,
                            'error': error
                        });
                        console.error(`--- Error requesting ${ticker}. Error: ${error}. Path: ${requestPath} ---`);
                    }
                    resolve(jsonObj)
                });
            }).on('error', (error) => {
                Logger.logError({
                    'ticker': ticker,
                    'url': requestPath,
                    'error': error
                });
            }).on('timeout', () => {
                Logger.logError({
                    'ticker': ticker,
                    'url': requestPath,
                    'error': 'timeout'
                });
            });
        });
    }
}

module.exports = TDDataService;