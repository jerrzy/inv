const DBClient = require('../repository/DBClient');

class Utility {
    static CALL_OPTION = 'CALL';
    static PUT_OPTION = 'PUT';

    static isCall(optionType) {
        return optionType.toLowerCase() == Utility.CALL_OPTION.toLowerCase();
    }

    static isPut(optionType) {
        return optionType.toLowerCase() == Utility.PUT_OPTION;
    }

    static epochToDate(epoch) {
        return new Date(epoch);
    }

    static getRatio(numerator, denoninator) {
        if(denoninator == 0) {
            return 0;
        }
        return parseFloat(Math.abs(numerator / denoninator).toFixed(5));
    }

    static sanitizeJSONForMongo(o, level = 100) {
        var build = {}, key, newKey, value;
        for (key in o) {
            value = o[key];
            if (typeof value === "object") {
                value = (level > 0) ? Utility.sanitizeJSONForMongo(value, level - 1) : null     // If this is an object, recurse if we can
            }
            //        newKey = key.replace(/\\/g, '⍀').replace(/^\$/, '₴').replace(/\./g, '⋅')    // replace special chars prohibited in mongo keys
            newKey = key.replace('.', '__');
            build[newKey] = value
        }
        return build
    }

    static getTodayDatetime(workdayOnly = false) {
        return Utility.getTodayPlusDays(0, workdayOnly, true);
    }

    static getToday(workdayOnly = false) {
        return Utility.getTodayPlusDays(0, workdayOnly);
    }

    static getYesterday(workdayOnly = false) {
        return Utility.getTodayPlusDays(-1, workdayOnly);
    }

    /**
     * skip weekend. 
     * Move to previous weekday if offset < 0
     * Move to next weekday if offset > 0
     * 
     * @param {} offset 
     */
    static getTodayPlusDays(offset = 0, workdayOnly, includeTime=false) {
        const today = Utility.#getDayPlusDays(offset, workdayOnly);
        return Utility.formatDate(today, includeTime);
    }

    static getLocalTodayPlusDays(offset = 0, workdayOnly, includeTime=false) {
        const today = Utility.#getDayPlusDays(offset, workdayOnly);
        return Utility.formatLocalDate(today, includeTime);
    }

    static #getDayPlusDays(offset = 0, workdayOnly) {
        let today = new Date();
        let dayOffset = offset;
        while(dayOffset != 0) {
            today.setDate(today.getDate() + (offset > 0 ? 1 : -1));
            if(workdayOnly){
                if (offset >= 0) {
                    if (today.getDay() == 0) {
                        today.setDate(today.getDate() + 1);
                    } else if (today.getDay() == 6) {
                        today.setDate(today.getDate() + 2);
                    }
                } else {
                    if (today.getDay() == 0) {
                        today.setDate(today.getDate() - 2);
                    } else if (today.getDay() == 6) {
                        today.setDate(today.getDate() - 1);
                    }
                }
            }
            offset > 0 ? dayOffset-- : dayOffset++;
        }
        return today;
    }

    static formatDate(datetime, includeTime=false) {
        const quoteDay = ("0" + datetime.getUTCDate()).slice(-2);
        const quoteMonth = ("0" + (datetime.getUTCMonth() + 1)).slice(-2);
        if(includeTime){
            return `${datetime.getFullYear()}-${quoteMonth}-${quoteDay} ${datetime.getUTCHours()}:${datetime.getUTCMinutes()}:${datetime.getUTCSeconds()}`;
        } else {
            return `${datetime.getFullYear()}-${quoteMonth}-${quoteDay}`;
        }
    }

    static formatLocalDate(datetime, includeTime=false) {
        const quoteDay = ("0" + datetime.getDate()).slice(-2);
        const quoteMonth = ("0" + (datetime.getMonth() + 1)).slice(-2);
        if(includeTime){
            return `${datetime.getFullYear()}-${quoteMonth}-${quoteDay} ${datetime.getHours()}:${datetime.getMinutes()}:${datetime.getSeconds()}`;
        } else {
            return `${datetime.getFullYear()}-${quoteMonth}-${quoteDay}`;
        }
    }

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = Utility