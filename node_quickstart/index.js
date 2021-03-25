const OptionApplication = require('./application/OptionApplication');
const TickerLoader = require('./application/TickerLoader');
const VolumeApplication = require('./application/VolumesApplication');
const DBClient = require('./repository/DBClient');

class Application{
    constructor(){
        this.tickerLoader = new TickerLoader();     
        this.optionApplication = new OptionApplication();
        this.volumeApplication = new VolumeApplication();
    }

    async run(){
        // await this.tickerLoader.loadTicker(); // maybe once per month
        // await this.tickerLoader.updateTicker(); // maybe once per month
        await this.optionApplication.loadOptions(); // normally only scan tickers with option. scan all tickers once a while.
        // console.log(`--- options loaded on ${Utility.getToday()}---`);
        // await this.optionApplication.processOptionStatistic();
        // // console.log('--- options statistics processed ---');
        // await this.volumeApplication.process();

        // await this.optionApplication.sweepOptions();

        // await this.optionApplication.flatOptionObjs(21);

        // const daysToFlat = 21;
        // let index = 1;
        // while(index < daysToFlat) {
        //     await this.optionApplication.flatOptionObjs(index);
        //     index++;
        // }
        


        // DBClient.close();
    }
}

app = new Application();
app.run();