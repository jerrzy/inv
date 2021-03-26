const Logger = require('../utility/Logger');
const StatisticProcessor = require("../processor/OptionProcessor/StatisticProcessor");
const TDDataService = require('../service/TDDataService');
const Utility = require('../utility/Utility');
const TickerRepository = require('../repository/TickerRepository');
const OptionRepository = require('../repository/OptionRepository');
const ObjectID = require('mongodb').ObjectID;

class OptionApplication {
    constructor() {
        this.requestInterval = 500;
        this.tDDataService = new TDDataService();
        this.statisticProcessor = new StatisticProcessor();
        this.tickerRepository = new TickerRepository();
        this.optionRepository = new OptionRepository();
        this.hasOption = true;
    }

    async loadOptions() {
        const tickers = await this.tickerRepository.getTickers(this.hasOption, 'AXAS');

        for (let index in tickers) {
            let ticker = tickers[index];
            await this.#loadOptionData(ticker, Utility.CALL_OPTION);
            await Utility.sleep(this.requestInterval);

            await this.#loadOptionData(ticker, Utility.PUT_OPTION);
            await Utility.sleep(this.requestInterval);
        }
    }

    /**
     * 1. check existance by ticker & insert_date. have to regex to stripe off time.
     * 
     * @param {*} ticker 
     * @param {*} optionType 
     * @returns 
     */
    async #loadOptionData(ticker, optionType) {
        const data = await this.tDDataService.requestOptionChain(ticker, optionType);
        if (data.status === 'FAILED') {
            Logger.log(ticker, `${optionType} No Option Chain`);
            return;
        }
        if (!data.underlying || !data.underlying.quoteTime) {
            Logger.log(ticker, `${optionType} No underlaying data`);
            Logger.logError({
                ticker: ticker,
                optionType: optionType,
                error: 'No underlaying data or quoteTime for option'
            });
            return;
        }
        this.#updateTickerForOption(ticker, data, optionType);
        // is date for this ticker already exists?
        try {
            const epoch = data.underlying.quoteTime / 1000; // ms to s
            let quoteDatetime = new Date(0); // The 0 there is the key, which sets the date to the epoch
            quoteDatetime.setUTCSeconds(epoch);
            const quoteDate = Utility.formatLocalDate(quoteDatetime);
            const existingOptionObj = await this.optionRepository.getOptionByTickerAndQuoteDate(data.symbol, optionType, quoteDate);
            if (!existingOptionObj) {
                // orgnize data
                const sanitizedJSON = Utility.sanitizeJSONForMongo(data);
                // flat option chain
                const flatOptionChainArray = this.flatOptionObjs(sanitizedJSON, optionType);
                sanitizedJSON.flat_option_chain = flatOptionChainArray;
                sanitizedJSON.quote_date = quoteDate;
                this.optionRepository.insertOption(sanitizedJSON, optionType);
                Logger.log(ticker, `${optionType} Option chain added`);
            } else {
                Logger.log(ticker, `${optionType} Option exists`);
            }
        } catch (error) {
            Logger.logError({
                ticker: ticker,
                optionType: optionType,
                'error': error
            });
        }
    }

    /**
     * use option quote to check existence
     */
    async processOptionStatistic() {
        const tickers = await this.tickerRepository.getTickers(this.hasOption);
        // await this.#processStatistics(tickers, Utility.CALL_OPTION);
        await this.#processStatistics(tickers, Utility.PUT_OPTION);
    }

    // tickerRepository.getSharesOutstanding('FUBO').then(ret => console.log(ret))

    async #processStatistics(tickers, optionType) {
        const today = Utility.getTodayPlusDays(-1, true);
        const yesterday = Utility.getTodayPlusDays(-2, true);
        // const today = Utility.getToday(true);
        // const yesterday = Utility.getYesterday(true);
        for (let index in tickers) {
            let ticker = tickers[index];
            const optionChainToday = await this.optionRepository.getByTickerAndInsertDate(ticker, optionType, today);
            const optionChainYesterday = await this.optionRepository.getByTickerAndInsertDate(ticker, optionType, yesterday);
            const fundamental = await this.tickerRepository.getFundamental(ticker);

            if (optionChainToday && optionChainYesterday) {
                let chainToday;
                let chainYesterday;
                if (Utility.isCall(optionType)) {
                    chainToday = optionChainToday.callExpDateMap;
                    chainYesterday = optionChainYesterday.callExpDateMap;
                } else {
                    chainToday = optionChainToday.putExpDateMap;
                    chainYesterday = optionChainYesterday.putExpDateMap;
                }

                const exists = await this.optionRepository.optionStatisticsExists(ticker, optionType, yesterday, today);
                if (!exists) {
                    const optionStatistics = this.statisticProcessor.process(chainToday, chainYesterday, fundamental);
                    const objectToInsert = {
                        ticker: ticker,
                        optionType: optionType,
                        statistics: optionStatistics,
                        left_date: yesterday,
                        right_date: today
                    }
                    await this.optionRepository.insertOptionStatistics(objectToInsert);
                    Logger.log(ticker, `Added - between ${today}-${yesterday}`);
                } else {
                    Logger.log(ticker, `Exists - between ${today}-${yesterday}`);
                }
            } else {
                Logger.log(ticker, `No Option Chain ${today}-${yesterday}`);
            }
        }
    }

    flatOptionObjs(optionObj, optionType) {
        let chainObj;
        if (Utility.isCall(optionType)) {
            chainObj = optionObj['callExpDateMap'];
        } else {
            chainObj = optionObj['putExpDateMap'];
        }
        let chainArray = [];
        for (let key in chainObj) {
            // expiration date and days to expire
            const expDate = key.split(':')[0];
            const daysToExpire = key.split(':')[1];

            const curObj = chainObj[key];
            for (let strike in curObj) {
                const detail = curObj[strike][0];
                detail.expireDate = expDate;
                detail.daysToExpire = parseInt(daysToExpire);
                chainArray.push(detail);
            }
        }
        return chainArray;
    }

    async #updateTickerForOption(ticker, data, optionType) {
        let keyName = `has_${optionType.toLowerCase()}_option`;
        if (data.status === 'FAILED' || !data.underlying) {
            this.tickerRepository.update(ticker, {
                [keyName]: false
            });
        } else {
            this.tickerRepository.update(ticker, {
                [keyName]: true
            });
        }
    }

    async sweepOptions() {
        const collection = await this.optionRepository.getOptionCollection('put');
        const myCursor = await collection.find({});

        while (await myCursor.hasNext()) {
            const doc = await myCursor.next();
            if (doc) {
                console.log(`${doc.symbol} - ${doc.quote_date}`);
                const id = new ObjectID(doc._id.toString());

                const chainArray = doc.flat_option_chain;
                if(chainArray) {
                    for (let j = 0; j < chainArray.length; j++) {
                        chainArray[j].daysToExpire = parseInt(chainArray[j].daysToExpire);
                    }
                    // doc.
                    const ret = await collection.updateOne({ _id: id }, { $set: { flat_option_chain: chainArray } });
                }
            }
        }

        // for (let i = 0; i < optionArr.length; i++) {
        //     const doc = optionArr[i];

        //     console.log(`${doc.symbol} - ${doc.quoteDate}`);
        //     const id = new ObjectID(doc._id.toString());

        //     const optionData = await collection.findOne({ _id: id });
        //     const chainArray = optionData.flat_option_chain;

        //     for (let j = 0; j < chainArray.length; j++) {
        //         chainArray[j].daysToExpire = parseInt(chainArray[j].daysToExpire);
        //     }
        //     // doc.
        //     const ret = await collection.updateOne({ _id: id }, { $set: { flat_option_chain: chainArray } });
        //     // console.log(ret);
        // }
        console.log('end');
    }
}

module.exports = OptionApplication;