class CandleUtility {

    //  ???  need to know difference between closePrice to lastPrice for RT candle

    static getBodyRT(realtimeCandle) {
        return Math.abs(realtimeCandle.lastPrice - realtimeCandle.openPrice);
    }

    static getDownShadowRT(realtimeCandle) {
        if (realtimeCandle.lastPrice > realtimeCandle.openPrice) {
            // green
            return Math.abs(realtimeCandle.lowPrice - realtimeCandle.openPrice);
        } else {
            // red
            return Math.abs(realtimeCandle.lowPrice - realtimeCandle.lastPrice);
        }
    }

    static getUpShadowRT(realtimeCandle) {
        if (realtimeCandle.lastPrice > realtimeCandle.openPrice) {
            // green
            return Math.abs(realtimeCandle.highPrice - realtimeCandle.closePrice);
        } else {
            // red
            return Math.abs(realtimeCandle.highPrice - realtimeCandle.openPrice);
        }
    }
}

module.exports = CandleUtility;