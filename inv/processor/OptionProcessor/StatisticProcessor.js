var _ = require('lodash');
const Utility = require('../../utility/Utility');

const Open_Interest_Field_Name = 'openInterest';
const Volume_Field_Name = 'totalVolume';

class StatisticProcessor {
    process(optionToday, optionYesterday, fundamental) {
        this.changeArr = [];
        this.currentSingleOptionPath = [];
        this.optionToday = optionToday;
        this.optionYesterday = optionYesterday;
        this.totalVolume = 0;
        this.totalVolumeIncreased = 0;
        this.totalVolumeDecreased = 0;
        this.totalOpenInterest = 0;
        this.totalOpenInterestIncresed = 0;
        this.totalOpenInterestDecresed = 0;
        this.volumeToShareOutRatio = 0;
        this.totalOTMVolume = 0;
        this.totalITMVolume = 0;
        this.totalOTMOpenInterest = 0;
        this.totalITMOpenInterest = 0;
        this.#convertObjectToArray(this.optionToday);
        // console.log(this.changeArr);
        return {
            volume: {
                total: this.totalVolume,
                OTM: this.totalOTMVolume,
                ITM: this.totalITMVolume,
                OTM_over_ITM: Utility.getRatio(this.totalOTMVolume, this.totalITMVolume),
                increased: this.totalVolumeIncreased,
                decreased: this.totalVolumeDecreased,
                total_over_sharesout: Utility.getRatio(this.totalVolume, (fundamental.sharesOutstanding / 100)),
                increased_over_sharesout: Utility.getRatio(this.totalVolumeIncreased, (fundamental.sharesOutstanding / 100)),
                decreased_over_sharesout: Utility.getRatio(this.totalVolumeDecreased, (fundamental.sharesOutstanding / 100)),
                total_over_10d_ave: Utility.getRatio(this.totalVolume, (fundamental.vol10DayAvg / 100)),
                increased_over_10d_ave: Utility.getRatio(this.totalVolumeIncreased, (fundamental.vol10DayAvg / 100)),
                decreased_over_10d_ave: Utility.getRatio(this.totalVolumeDecreased, (fundamental.vol10DayAvg / 100)),
                total_over_3m_ave: Utility.getRatio(this.totalVolume, (fundamental.vol3MonthAvg / 100)),
                increased_over_3m_ave: Utility.getRatio(this.totalVolumeIncreased, (fundamental.vol3MonthAvg / 100)),
                decreased_over_3m_ave: Utility.getRatio(this.totalVolumeDecreased, (fundamental.vol3MonthAvg / 100))
            }, 
            open_interest: {
                total: this.totalOpenInterest,
                OTM: this.totalOTMOpenInterest,
                ITM: this.totalITMOpenInterest,
                OTM_over_ITM: Utility.getRatio(this.totalOTMOpenInterest, this.totalITMOpenInterest),
                incresed: this.totalOpenInterestIncresed,
                decresed: this.totalOpenInterestDecresed,
                total_over_sharesout: Utility.getRatio(this.totalOpenInterest, (fundamental.sharesOutstanding / 100)),
                increased_over_sharesout: Utility.getRatio(this.totalOpenInterestIncresed, (fundamental.sharesOutstanding / 100)),
                decreased_over_sharesout: Utility.getRatio(this.totalOpenInterestDecresed, (fundamental.sharesOutstanding / 100)),
                total_over_10d_ave: Utility.getRatio(this.totalOpenInterest, (fundamental.vol10DayAvg / 100)),
                increased_over_10d_ave: Utility.getRatio(this.totalOpenInterestIncresed, (fundamental.vol10DayAvg / 100)),
                decreased_over_10d_ave: Utility.getRatio(this.totalOpenInterestDecresed, (fundamental.vol10DayAvg / 100)),
                total_over_3m_ave: Utility.getRatio(this.totalOpenInterest, (fundamental.vol3MonthAvg / 100)),
                increased_over_3m_ave: Utility.getRatio(this.totalOpenInterestIncresed, (fundamental.vol3MonthAvg / 100)),
                decreased_over_3m_ave: Utility.getRatio(this.totalOpenInterestDecresed, (fundamental.vol3MonthAvg / 100))
            },
            change: this.changeArr
        };
    };

    /**
     * strip off days-to-expire and find corresponding option data object of yesterday. e.g. 2021-03-19:14
     * 
     * @param {*} key 
     * @param {*} object 
     */
    #findOptionObjectByDate = function (date, object) {
        let targetObject;
        for (let curKey in object) {
            if (curKey.includes(date)) {
                targetObject = object[curKey];
            }
        }
        return targetObject;
    }

    #calculateChange = function (singleOptionObject, keyPathArr) {
        // complete the key path by adding the openInterest field
        const completeKeyPath = keyPathArr.slice();
        // the first element is always the date with number of days to expire, e.g. 2021-03-19:14
        let dateKey = completeKeyPath.shift();
        let date = dateKey.split(':')[0];
        let daysToExpire = dateKey.split(':')[1];
        let optionObjectYesterday = this.#findOptionObjectByDate(date, this.optionYesterday);

        let openInterestToday = singleOptionObject.openInterest;
        let volumeToday = singleOptionObject.totalVolume;

        let openInterestPathArray = completeKeyPath.slice();
        openInterestPathArray.push(Open_Interest_Field_Name);
        let openInterestKeyPath = openInterestPathArray.join(".");
        let volumeKeyPathArray = completeKeyPath.slice();
        volumeKeyPathArray.push(Volume_Field_Name);
        let volumeKeyPath = volumeKeyPathArray.join(".");

        let openInterestYesterday = _.get(optionObjectYesterday, openInterestKeyPath, 'default');
        let volumeYesterday = _.get(optionObjectYesterday, volumeKeyPath, 'default');

        // volume vs open interest
        this.totalOpenInterest += openInterestToday;
        this.totalVolume += volumeToday;

        // OTM vs ITM
        if(singleOptionObject.inTheMoney) {
            this.totalITMVolume += volumeToday;
            this.totalITMOpenInterest += openInterestToday;
        } else {
            this.totalOTMVolume += volumeToday;
            this.totalOTMOpenInterest += openInterestToday;
        }

        let openInterestChange = 0;
        if (openInterestToday - openInterestYesterday != 0) {
            openInterestChange = openInterestToday - openInterestYesterday;
            if (!isNaN(openInterestChange)) {
                openInterestChange > 0 ? this.totalOpenInterestIncresed += openInterestChange : this.totalOpenInterestDecresed += openInterestChange;
            }
        }
        let volumeChange = 0;
        if (volumeToday - volumeYesterday != 0) {
            volumeChange = volumeToday - volumeYesterday;
            if (!isNaN(volumeChange)) {
                volumeChange > 0 ? this.totalVolumeIncreased += volumeChange : this.totalVolumeDecreased += volumeChange;
            }
        }
        // add to DB only when there's some change
        if (openInterestChange != 0 || volumeChange != 0) {
            let strike = completeKeyPath.shift();
            this.changeArr.push({
                date: date,
                daysToExpire: parseInt(daysToExpire),
                strike: parseFloat(strike.replace('__', '.')),
                pathInOptionChain: `${dateKey}-${openInterestKeyPath}`,
                openInterestChange: openInterestChange,
                volumeChange: volumeChange
            });
        }
    }

    /**
     * the inner most object having the detail with a certain strike.
     * 
     * @param {*} object 
     */
    #convertObjectToArray = function (object) {
        if (typeof object === "object") {
            if (typeof object.openInterest != 'undefined') {
                this.#calculateChange(object, this.currentSingleOptionPath);
                this.currentSingleOptionPath.pop();
            } else {
                for (let key in object) {
                    this.currentSingleOptionPath.push(key);
                    this.#convertObjectToArray(object[key]);
                }
                this.currentSingleOptionPath.pop();
            }
        }
    }
}


module.exports = StatisticProcessor;