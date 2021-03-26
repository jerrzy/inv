const DBClient = require('./DBClient');
const Utility = require('../utility/Utility');

class TickerRepository {
    constructor() {
        this.tickerCollectionName = 'tickers';
    }

    async getTickerCollection() {
        const collection = await DBClient.getCollection(this.tickerCollectionName);
        return collection;
    }

    async insert(tickerObj) {
        tickerObj.insert_date = Utility.formatLocalDate(new Date(), true);
        const collection = await this.getTickerCollection();
        await collection.insertOne(tickerObj);
    }

    async getTickers(hasOption, beginWith) {
        let tickerArray = [];
        let criteria = {};
        if (hasOption != undefined) {
            criteria.has_call_option = hasOption;
        }
        const collection = await this.getTickerCollection();
        const findResult = collection.find(criteria);
        let begin = false;
        await findResult.forEach(ret => {
            if (!beginWith) {
                begin = true;
            } else if (ret.ticker == beginWith && begin == false) {
                begin = true;
            }
            if (begin) {
                tickerArray.push(ret.ticker);
            }
        });
        // for testing
        // tickerArray = ['AGBAU'];
        return tickerArray;
    }

    async getSharesOutstanding(ticker) {
        const collection = await this.getTickerCollection();
        const ret = await collection.findOne({ 'ticker': ticker }, { projection: { 'fundamental.sharesOutstanding': 1 } });
        return ret.fundamental.sharesOutstanding;
    }

    async getFundamental(ticker) {
        const collection = await this.getTickerCollection();
        const ret = await collection.findOne({ 'ticker': ticker }, { projection: { 'fundamental': 1 } });
        return ret.fundamental;
    }

    async update(ticker, obj) {
        obj.update_date = Utility.formatLocalDate(new Date(), true);
        this.getTickerCollection().then(collection => collection.updateOne({ 'ticker': ticker }, {
            $set: obj
        }));
    }

    async getTickerObj(ticker) {
        const collection = await this.getTickerCollection();
        const tickerObj = await collection.findOne({ 'ticker': ticker });
        return tickerObj;
    }

    async isETF(ticker) {
        const collection = await this.getTickerCollection();
        const tickerObj = await collection.findOne({ 'ticker': ticker });
        return tickerObj.ETF;
    }
}

module.exports = TickerRepository;