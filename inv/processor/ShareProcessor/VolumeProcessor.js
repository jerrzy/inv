const Utility = require("../../utility/Utility");

class VolumeProcessor {
    constructor() {
        this.bigVolumeRatio = 2;
        this.longShadowRatio = 1;
    }

    process(ticker, candles) {
        let totalVolume = 0;
        let totalClosePrice = 0;
        let count = candles.length;
        candles.forEach(candle => {
            totalVolume += candle.volume;
            totalClosePrice += candle.close;
        });
        let aveVolume = totalVolume / count;
        let todayDownShadowOverBody = 0;
        let todayUpShadowOverBody = 0;
        let todayPriceDropped = 0;
        let todayPriceRecovered = 0;
        let todayPriceDroppedOverOpen = 0;
        let todayPriceDroppedOverBody = 0;
        let todayPriceRecoveredOverOpen = 0;
        let todayPriceRecoveredOverBody = 0;
        let isTodayGreen = false;
        let lastCandleTimeindex = 0;

        let getBigVolumeObj = (days) => {
            return {
                'days': days,
                bigVolumeCounts: 0,
                longDownShadowCounts: 0,
                longUpShadowCounts: 0,
                aveLongDownShadowsOverBody: 0,
                aveLongUpShadowsOverBody: 0,
                aveBigVolumesOverAve: 0,
                tmpTotalBigVolume: 0,
                tmpLongDownShadowOverBody: 0,
                tmpLongUpShadowOverBody: 0
            }
        }

        let bigVolumeCheckArray = [];
        bigVolumeCheckArray.push(getBigVolumeObj(5));
        bigVolumeCheckArray.push(getBigVolumeObj(10));
        bigVolumeCheckArray.push(getBigVolumeObj(30));
        bigVolumeCheckArray.push(getBigVolumeObj(50));

        let reversedCandels = candles.slice().reverse();
        for (let index in reversedCandels) {
            const curCandle = reversedCandels[index];
            const curVolume = curCandle.volume;
            if (index == 0) {
                lastCandleTimeindex = curCandle.datetime;
                todayDownShadowOverBody = this.#getDownShadowOverBody(curCandle);
                todayUpShadowOverBody = this.#getUpShadowOverBody(curCandle);
                todayPriceDropped = Math.abs(curCandle.low - curCandle.open);
                todayPriceRecovered = Math.abs(curCandle.close - curCandle.low);
                todayPriceDroppedOverOpen = todayPriceDropped / curCandle.open;
                todayPriceDroppedOverBody = todayPriceDropped / Math.abs(curCandle.close - curCandle.open);
                todayPriceRecoveredOverOpen = todayPriceRecovered / curCandle.open;
                todayPriceRecoveredOverBody = todayPriceRecovered / Math.abs(curCandle.close - curCandle.open);
                isTodayGreen = curCandle.close > curCandle.open;
            }
            bigVolumeCheckArray.forEach((obj) => {
                if (index < obj.days) {
                    if (this.#isBigVolume(curVolume, aveVolume)) {
                        obj.bigVolumes++;
                        obj.tmpTotalBigVolume += curVolume;
                    }
                    if (this.#isLongDownShadow(curCandle)) {
                        obj.longDownShadowCounts++;
                        obj.tmpLongDownShadowOverBody += this.#getDownShadowOverBody(curCandle);
                    }
                    if (this.#isLongUpShadow(curCandle)) {
                        obj.longUpShadowCounts++;
                        obj.tmpLongUpShadowOverBody += this.#getUpShadowOverBody(curCandle);
                    }
                }
            });
        }
        // calculate ratios
        bigVolumeCheckArray.forEach((obj) => {
            obj.aveBigVolumesOverAve = obj.tmpTotalBigVolume / obj.days;
            obj.aveLongDownShadowsOverBody = obj.tmpLongDownShadowOverBody / obj.longDownShadowCounts;
            obj.aveLongUpShadowsOverBody = obj.tmpLongUpShadowOverBody / obj.longUpShadowCounts;
        });

        let result = {};
        bigVolumeCheckArray.forEach((obj) => {
            result[obj.days] = {
                big_volume_count: obj.bigVolumeCounts,
                long_down_s_count: obj.longDownShadowCounts,
                long_up_s_count: obj.longUpShadowCounts,
                ave_long_down_s_over_body: obj.aveLongDownShadowsOverBody,
                ave_long_up_s_over_body: obj.aveLongUpShadowsOverBody,
                ave_big_volume_over_ave: obj.aveBigVolumesOverAve
            };
        });

        result[1] = {
            down_s_over_body: todayDownShadowOverBody,
            up_s_over_body: todayUpShadowOverBody,
            price_dropped: todayPriceDropped,
            price_recovered: todayPriceRecovered,
            price_dropped_over_open: todayPriceDroppedOverOpen,
            price_dropped_over_body: todayPriceDroppedOverBody,
            price_recovered_over_open: todayPriceRecoveredOverOpen,
            price_recovered_over_body: todayPriceRecoveredOverBody,
            green: isTodayGreen
        }

        result.ave_close = totalClosePrice / candles.length; // for filtering out penny stocks

        result.last_candle_date = Utility.formatDate(Utility.epochToDate(lastCandleTimeindex));
        return result;
    }

    #isBigVolume(volume, aveVolume) {
        return volume > aveVolume * this.bigVolumeRatio;
    }

    #isLongDownShadow(candle) {
        return this.#getDownShadowOverBody(candle) > this.longShadowRatio;
    }

    #isLongUpShadow(candle) {
        return this.#getUpShadowOverBody(candle) > this.longShadowRatio;
    }

    #getDownShadowOverBody(candle) {
        const bodyLength = Math.abs(candle.close - candle.open);
        if (candle.close > candle.open) {
            // green
            const downLength = Math.abs(candle.low - candle.open);
            return downLength / bodyLength;
        } else {
            // red
            const downLength = Math.abs(candle.low - candle.close);
            return downLength / bodyLength;
        }
    }

    #getUpShadowOverBody(candle) {
        const bodyLength = Math.abs(candle.close - candle.open);
        if (candle.close > candle.open) {
            // green
            const upLength = Math.abs(candle.high - candle.close);
            return upLength / bodyLength;
        } else {
            // red
            const upLength = Math.abs(candle.high - candle.open);
            return upLength / bodyLength;
        }
    }

    #getPriceRecovered(candle) {
        if (candle.close > candle.open) {
            return Math.abs(candle.low - candle.open);
        } else {
            return Math.abs(candle.low - candle.close);
        }
    }

};

module.exports = VolumeProcessor;