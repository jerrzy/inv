const PatternProcessor = require("./processor/ShareProcessor/PatternProcessor");
const TickerRepository = require("./repository/TickerRepository");
const TDDataService = require("./service/TDDataService");
const Logger = require('./utility/Logger');

class Application {
    constructor() {
        this.patternProcessor = new PatternProcessor();
        this.tdService = new TDDataService();
        this.tickerRepository = new TickerRepository();
    }

    async process() {
        let downShadows = [];

        const tickers = await this.tickerRepository.getTickers(true);
        // 100 per request
        const chunk = 200;
        const count = Math.ceil(tickers.length / chunk);

        Logger.log('begin');

        for(let i = 0; i < count; i++) {
            const thisChunkTickers = tickers.slice(i * chunk, i * chunk + chunk);
            const datas = await this.tdService.getRealTimeQuotes(thisChunkTickers);
            // const datas = await this.tdService.getRealTimeQuotes(['FUBO', 'AAL']);
            
            for(let ticker in datas) {
                // if(ticker == 'AAL') {
                //     console.log();
                // }
                const quoteObj = datas[ticker];
                if(quoteObj.assetMainType == 'EQUITY' && quoteObj.assetType == 'EQUITY') {
                    const downShadow = this.patternProcessor.getDownShadow(quoteObj);    
                    const priceDrop = Math.abs(quoteObj.lowPrice - quoteObj.openPrice);
                    if(downShadow != Infinity && downShadow > 20 && priceDrop > quoteObj.openPrice * 0.05) {
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

        downShadows.sort((a, b) => {return b.downShadow - a.downShadow});

        console.log();
    }
}


const app = new Application();
app.process();
