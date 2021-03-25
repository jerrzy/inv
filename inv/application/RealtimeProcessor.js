const PatternProcessor = require("../processor/ShareProcessor/PatternProcessor");
const TickerRepository = require("../repository/TickerRepository");
const TDDataService = require("../service/TDDataService");
const Logger = require('../utility/Logger');
const Utility = require("../utility/Utility");
const CandleUtility = require("../utility/CandleUtility");

class RealtimeProcessor {
    constructor() {
        this.patternProcessor = new PatternProcessor();
        this.tdService = new TDDataService();
        this.tickerRepository = new TickerRepository();
    }

    async process() {
        let downShadows = [];

        const tickers = await this.tickerRepository.getTickers();
        // 100 per request
        const chunk = 200;
        const count = Math.ceil(tickers.length / chunk);

        Logger.log('begin');

        for (let i = 0; i < count; i++) {
            const thisChunkTickers = tickers.slice(i * chunk, i * chunk + chunk);
            const datas = await this.tdService.getRealTimeQuotes(thisChunkTickers);
            // const datas = await this.tdService.getRealTimeQuotes(['FUBO', 'AAL']);

            for (let ticker in datas) {
                // if(ticker == 'AAL') {
                //     console.log();
                // }
                const quoteObj = datas[ticker];
                if (quoteObj.assetMainType == 'EQUITY' && quoteObj.assetType == 'EQUITY') {
                    const downShadow = CandleUtility.getDownShadowRT(quoteObj);
                    const body = CandleUtility.getBodyRT(quoteObj);

                    const priceDropped = Math.abs(quoteObj.lowPrice - quoteObj.openPrice);
                    const priceRecovered = Math.abs(quoteObj.lastPrice - quoteObj.lowPrice);

                    const downSOverBody = downShadows / body;
                    if (downSOverBody != Infinity && 
                        downSOverBody > 20 && // down shadow is 20 times more than body
                        priceRecovered > priceDropped // price has recovered more than dropped
                        ) {
                        downShadows.push({
                            'ticker': ticker,
                            'downShadow': downShadow
                        });
                        // console.log(ticker);
                    }
                }
            }
        }

        Logger.log('end');

        downShadows.sort((a, b) => { return b.downShadow - a.downShadow });

        console.log();
    }
}

module.exports = RealtimeProcessor;