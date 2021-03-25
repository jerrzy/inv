const DBClient = require('./DBClient');
const Utility = require('../utility/Utility');

class VolumeRepository {
    constructor() {
        this.volumeCollectionName = 'volumeStatistics';
    }

    async existsByLastCandleDate(ticker, lastCandleDate) {
        const collection = await DBClient.getCollection(this.volumeCollectionName);
        const count = await collection.find({
            'ticker': ticker, 'detail.last_candle_date': lastCandleDate
        }).count();
        return count != 0;
    }

    async existsByTickerAndInsertDate(ticker, insertDate) {
        const collection = await DBClient.getCollection(this.volumeCollectionName);
        const count = await collection.find({
            'ticker': ticker, 'insert_date': {
                $regex: `^${insertDate}`
            }
        }).count();
        return count != 0;
    }

    async insert(obj) {
        obj.insert_date = Utility.formatLocalDate(new Date(), true);
        const collection = await DBClient.getCollection(this.volumeCollectionName);
        collection.insertOne(obj);
    }

    async update(ticker, obj) {
        const collection = await DBClient.getCollection(this.volumeCollectionName);
        await collection.updateMany({ 'ticker': ticker }, { $set: obj });
    }
}

module.exports = VolumeRepository