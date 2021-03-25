const Utility = require('../../utility/Utility');
const Logger = require('../../utility/Logger');

class PatternProcessor {
    constructor() {
        this.scanEndDays = 22; // stop scanning when entered a month(22 days) window.
        this.daysRatioBelowTargetPrice = 0.6;
        this.priceRatioBelowTarget = 0.6;
        this.priceRange = 0.15;
        this.lowestPriceThreshold = 2; // no penny stocks
    }

    /**
     * the last candel is the last trade day.
     * @param {*} candles 
     */
    process(ticker, candles) {
        return this.#wPattern(ticker, candles);
    }

    /**
     * scan at least a year's daily close price to find W pattern. 
     * 1. Exclude stocks with today's price below 1.
     * 2. Exclude stocks that price was below 1.
     * 
     * @param {*} ticker 
     * @param {*} candles 
     * @returns 
     */
    #wPattern(ticker, candles) {
        const count = candles.length;
        let candleToday = candles[count - 1];
        let priceToday = 0;
        if (candleToday) {
            priceToday = candleToday.close;
        } else {
            priceToday = candles[count - 2].close;
        }
        // ! exclude if today's price is below 1
        if (priceToday < this.lowestPriceThreshold) {
            return;
        }
        const priceRangeLow = priceToday * (1 - this.priceRange);
        const priceRangeHigh = priceToday * (1 + this.priceRange);
        let lowestPriceInWindow = 99999;
        let highestPriceInWindow = 0;
        let targetPriceFound = false;
        let targetPrice = 0;
        let targetPriceIndex = 0;
        let daysBelowTarget = 0;
        let daysTargetPriceFoundTillToday = 0;
        let patternBeginDate = 0;
        let daysPriceInRange = 0;
        for (let i = 0; i < count; i++) {
            const candle = candles[i];
            // const date = Utility.epochToDate(candle.datetime);
            const curPrice = candle.close;
            if (lowestPriceInWindow > curPrice) {
                lowestPriceInWindow = curPrice;
            }
            if(highestPriceInWindow < curPrice) {
                highestPriceInWindow = curPrice;
            }
            if (!targetPriceFound && (count - i < this.scanEndDays)) {
                return;
            }

            if (!targetPriceFound && (curPrice < priceRangeHigh && curPrice > priceRangeLow)) {
                // console.log(`--- Target Price located! ---`);
                targetPriceFound = true;
                targetPrice = curPrice;
                targetPriceIndex = i;
                patternBeginDate = Utility.formatDate(Utility.epochToDate(candle.datetime));

                continue;
            }
            // count days
            if (targetPriceFound) {
                daysTargetPriceFoundTillToday++
                if (curPrice < targetPrice * this.priceRatioBelowTarget) {
                    daysBelowTarget++;
                }
                if(curPrice < priceRangeHigh && curPrice > priceRangeLow){
                    daysPriceInRange++;
                }
            }
        }
        // ! exclude if lowest price is below 1
        if (lowestPriceInWindow < this.lowestPriceThreshold) {
            return;
        }
        const daysThreashold = daysTargetPriceFoundTillToday * this.daysRatioBelowTargetPrice;
        if (daysBelowTarget >= daysThreashold) {
            Logger.log(ticker, '!W Pattern Found!');
            return {
                name: 'w',
                'ticker': ticker,
                begin_date: patternBeginDate,
                begin_price: targetPrice,
                lowest_price: lowestPriceInWindow,
                highest_price: highestPriceInWindow,
                days_price_below: daysBelowTarget,
                days_price_in_range: daysPriceInRange,
                days_total_till_today: daysTargetPriceFoundTillToday,
                price_below_over_total: Utility.getRatio(daysBelowTarget, daysTargetPriceFoundTillToday),
                price_in_range_over_total: Utility.getRatio(daysPriceInRange, daysTargetPriceFoundTillToday)
            }
        }
    }

}

module.exports = PatternProcessor;