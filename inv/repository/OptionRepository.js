const DBClient = require('./DBClient');
const Utility = require('../utility/Utility');
const Logger = require('../utility/Logger');

class OptionRepository {
    constructor() {
        this.callOptionsCollectionName = 'callOptions';
        this.putOptionsCollectionName = 'putOptions';
        this.optionStatisticsCollectionName = 'optionStatistics';
    }

    async getOptionByTickerAndQuoteDate(ticker, optionType, quoteDate) {
        // Logger.log();
        const collection = await this.getOptionCollection(optionType);
        const optionObj = await collection.findOne({ symbol: ticker, quote_date: quoteDate });
        // Logger.log();
        return optionObj;
    }

    async optionStatisticsExists(ticker, optionType, left_date, right_date) {
        const collection = await DBClient.getCollection(this.optionStatisticsCollectionName);
        const count = await collection.find({
            'ticker': ticker,
            'optionType': optionType,
            'left_date': left_date,
            'right_date': right_date
        }).count();
        return count != 0;
    }

    async getByTickerAndInsertDate(ticker, optionType, insertDate) {
        const collection = await this.getOptionCollection(optionType);
        const obj = await collection.findOne({
            symbol: ticker, insert_date: {
                $regex: `^${insertDate}`
            }
        });
        return obj
    }

    async insertOption(optionObj, optionType) {
        optionObj.insert_date = Utility.formatLocalDate(new Date(), true);
        this.getOptionCollection(optionType).then(collection => collection.insertOne(optionObj));
    }

    async insertOptionStatistics(obj) {
        obj.insert_date = Utility.formatLocalDate(new Date(), true);
        return DBClient.getCollection(this.optionStatisticsCollectionName).then(collection => {
            collection.insertOne(obj);
        });
    }

    async getOptionCollection(optionType) {
        if (Utility.isCall(optionType)) {
            return DBClient.getCollection(this.callOptionsCollectionName);
        } else {
            return DBClient.getCollection(this.putOptionsCollectionName);
        }
    }

    async updateByTickerAndInsertDate(ticker, insertDate, optionType, data) {
        return this.getOptionCollection(optionType).then(collection => {
            collection.updateOne({
                'symbol': ticker, 'insert_date': {
                    $regex: `^${insertDate}`
                }
            }, {
                $set: data
            });
        });
    }

    async queryAggregate(query) {
        const collection = await DBClient.getCollection(this.putOptionsCollectionName);
        const cursor = await collection.aggregate(query);
        let ret = [];
        await cursor.forEach((obj) => {
            ret.push(obj);
        });

        return ret;
    }
}

module.exports = OptionRepository;