var api = (function (){
	const _conf = {
		td: {
			api_get_option: 'https://api.tdameritrade.com/v1/marketdata/chains',
			api_get_ticker: 'https://api.tdameritrade.com/v1/marketdata/quotes',
			api_key: ''
		},
		best: {
			show_top_k: 6,
			safe_margins: [0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.18, 0.19, 0.2, 0.21, 0.22, 0.23, 0.24, 0.25, 0.26, 0.27, 0.28, 0.29, 0.30],
			safe_margin_options: {},
			default_ticker_list: ['XOM', 'AAPL', 'AMWL', 'MSFT', 'F', 'M', 'BA'],
		},
		weekly: true,
		max_ratio_value: 100,
		safe_margin_max: 0.30,
		safe_margin_min: 0.05,
		days_per_month: 31,
	};
	/*
	 * date window is from today to next month.
	*/
	const _getOptions = function(config) {
		const today = new Date();
		const fromDate = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
		if(api.conf.weekly){
			// a week later
			today.setDate(today.getDate() + 7);	
		} else {
			// a month later
			today.setMonth(today.getMonth() + 1);
		}
		
		const toDate = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
		return $.ajax({
			url: _conf.td.api_get_option,
			type: 'GET',
			async: true,
			data: {
				apikey: _conf.td.api_key,
				symbol: config.tick.toUpperCase(),
				contractType: 'PUT',
				// strikeCount: 14,
				strategy: 'SINGLE',
				range: 'OTM',
				fromDate: fromDate,
				toDate: toDate
			}
		});
	}

	const _quoteTicker = function(ticker){
		return $.ajax({
			url: _conf.td.api_get_ticker,
			type: 'GET',
			async: true,
			data: {
				apikey: _conf.td.api_key,
				symbol: ticker
			}
		});
	}
	
	/* {
		daysToExpire1: {
			safeMargin1: {},
			safeMargin2: {}
		},
		daysToExpire2: {
			safeMargin1: {},
			safeMargin2: {}
		}
	}
	*/
	const _calBestOnSafeMargin = function(optionData){
		// create the D2E object
		_conf.best.safe_margin_options[optionData.daysToExpiration] = _conf.best.safe_margin_options[optionData.daysToExpiration] || {};
		
		// find safe margin bucket
		let offset = _conf.max_ratio_value;
		let safeMargin = 0;
		_conf.best.safe_margins.forEach(function(safeMarginBucket, index){
			if(offset > Math.abs(safeMarginBucket - optionData.safeMarginRatio)) {
				safeMargin = safeMarginBucket;
				offset = Math.abs(safeMarginBucket - optionData.safeMarginRatio);
			}
		});
		
		// calculate rorc/arorc
		const rorc = _calRORC(optionData.mark, optionData.strikePrice);
		const arorc = _calARORC(rorc, optionData.daysToExpiration);
		// create SM object
		let bucketD2E = _conf.best.safe_margin_options[optionData.daysToExpiration];
		let safeMarginSortedArray = bucketD2E[safeMargin];	
		let newSMObject = {
				ticker: optionData.ticker,
				symbol: optionData.symbol,
				d2e: optionData.daysToExpiration,
				strike: optionData.strikePrice,
				underlyingPrice: optionData.underlyingPrice,
				mark: optionData.mark,
				safeMargin: optionData.safeMarginRatio,
				rorc: rorc,
				arorc: arorc
			};
		if(safeMarginSortedArray == undefined){
			// create the safe margin options array
			bucketD2E[safeMargin] = [newSMObject];
		} else {
			_InsertToSMList(safeMarginSortedArray, arorc, newSMObject);
		}
		// sort
		_conf.best.safe_margin_options[optionData.daysToExpiration] = _sortObjectFieldsByKey(bucketD2E);
	}

	const _calRORC = function(premium, strikePrice){
			return premium / strikePrice;
	}

	const _calARORC = function(rorc, daysToExp){
		let multiplier = _conf.days_per_month / daysToExp;
		if(multiplier > 4){
			multiplier = 4;
		}
		return rorc * multiplier * 12;
	}

	const _round = function(value){
		return value.toFixed(4);
	}

	const _toPercentage = function(value){
		let valuef = parseFloat(value);
		try{
			return ('%' + valuef.toFixed(4) * 100).substring(0, 6);
		}catch(e){
			console.error(e);
		}
	}

	const _isInSafeMargin = function(underlyingPrice, strikePrice){
		const safeMarginRatio = (underlyingPrice - strikePrice) / underlyingPrice;
		return safeMarginRatio > _conf.safe_margin_min && safeMarginRatio < _conf.safe_margin_max;
	}

	const _InsertToSMList = function(safeMarginSortedArray, arorc, newSMObject){
		if(!safeMarginSortedArray || safeMarginSortedArray.length == 0){
			return 0;
		}
		let index = 0;
		safeMarginSortedArray.forEach(function(item, i) {
			if(arorc < item.arorc){
				index++;
			}
		});
		// ignore if the prio one is on the same ticker, overwrite the latter one is on the same ticker
		if(index != 0 && safeMarginSortedArray[index - 1].ticker === newSMObject.ticker){
			return
		} else if(safeMarginSortedArray.length > index && safeMarginSortedArray[index].ticker === newSMObject.ticker){
			safeMarginSortedArray.splice(index, 1, newSMObject);
		} else {
			safeMarginSortedArray.splice(index, 0, newSMObject);
		}
	}
	
	const _sortObjectFieldsByKey = function(object){
		let keys = [], k, i, len;

		for (k in object) {
			if (object.hasOwnProperty(k)) {
				keys.push(k);
			}
		}

		keys.sort();
		keys.reverse()

		len = keys.length;

		let orderedObject = {};
		for (i = 0; i < len; i++) {
			k = keys[i];
			orderedObject[k] = object[k];
		}
		return orderedObject;
	}
	
	const _sleep = function(ms){
		//console.log(ms)
		return new Promise(resolve => setTimeout(resolve, ms));
	}
	
	return {
		conf: _conf,
		getOptions: _getOptions,
		quoteTicker: _quoteTicker,
		calBestOnSafeMargin: _calBestOnSafeMargin,
		calRORC: _calRORC,
		calARORC: _calARORC,
		round: _round,
		toPercentage: _toPercentage,
		isInSafeMargin: _isInSafeMargin,
		sleep: _sleep
	}
})();

