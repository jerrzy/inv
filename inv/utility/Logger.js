const Utility = require('./Utility');
const StackTrace = require('stack-trace');
const Path = require('path');
const DBClient = require('../repository/DBClient');

class Logger {
    /**
     * Use local datetime for normal log.
     * 
     * @param {*} ticker 
     * @param {*} message 
     */
    static log(ticker, message) {
        const trace = StackTrace.get();
        let traceInfo = '';
        if (trace && trace.length > 1) {
            const file = trace[1].getFileName();
            const func = trace[1].getFunctionName();
            const method = trace[1].getMethodName();
            const line = trace[1].getLineNumber();
            traceInfo = `${Path.basename(file)}:${func ? func : method}:${line}`;
        }
        const tickerInfo = ticker ? `${ticker.padEnd(6)}` : '';
        const messageInfo = message ? `${message}` : '';
        console.log(`-${Utility.formatLocalDate(new Date(), true).padEnd(19)}-${traceInfo}- ${tickerInfo}-${messageInfo}`);
    }

    /**
     * User UTC for diagnostic Error log.
     * 
     * @param {*} errorObj 
     */
    static async logError(errorObj) {
        const errorCollection = await DBClient.getCollection('errors');
        errorObj.insert_datetime = Utility.getTodayDatetime();
        errorCollection.insertOne(errorObj);
    }
}

module.exports = Logger;