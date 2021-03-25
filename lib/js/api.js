// GOOG,BA,XOM,AAPL,AMWL,MSFT,F,M,PLTR,NFLX,FB,UAL,FSLY,JD,BABA,TSLA,AAL,MCD,NIO,DIS,ATVI,AMD,SBUX,TSM,NET,PSTG,AMZN,ZM,GE,VMW,ADBE,BYND,SNOW,NOK,NVTA,ROKU,SQ,CRSP,TDOC,PRLB,WORK,Z,SPOT,TREE,MCRB,TWOU,IOVA,MTLS,NTLA,PD,VCYT,TWST,TWLO,EDIT,EXAS,SPLK,DOCU,ICE,CGEN,U,NTDOY,CERS,IRDM,NSTG,SNPS,PINS,PYPL,PACB,TCEHY,HUYA,SSYS,SE,SYRS,XONE,DOYU,ONVO
// ,ARCT,CDNA,PSNL,LOVA,CLLS,FATE,INCY,ACCD,BLI,IONS,VRTX,TXG,ADPT,SDGR,TAK,NVS,GH,CSTL,CDXS,PHR,BEAM,AQB,PSTI,ILMN,TMO,REGN,EVGN,RPTX,SURF,ONVO,DE,TRMB,XLNX,BYDDY,KTOS,CAT,WKHS,NXPI,FLIR,AVAV,KMTUY,SPCE,BIDU,TER,NIU,ANSS,NNDM,ISRG,ESLT,ADSK,ROK,HON,RAVN,MELI,SNAP,INTU,WDAY,LSPD,GWRE,PDD,SCHW,IBKR,IPOB,SI,LC,SHOP,HDB,NVDA,TRU,VRSK,BEKE,MKTX,ZS

var api = (function (){
	const _conf = {
		td: {
			api_get_data: 'https://api.tdameritrade.com/v1/marketdata/',
			api_get_option: 'https://api.tdameritrade.com/v1/marketdata/chains',
			api_get_ticker: 'https://api.tdameritrade.com/v1/marketdata/quotes',
			api_pricehistory: 'pricehistory',
			api_key: 'HI4XLAM9UUKXN6OSCM5SWNHSNT73DJ9G'
		},
		best: {
			show_top_k: 3,
			safe_margins: [],
			safe_margin_options: {},
			default_ticker_list: [],
		},
		/* data structure
			{
				ticker: '',
				strike: 0,
			}
		*/
		highlight: [],
		weekly: true,
		weekly_max_days_to_exp: 13,
		max_ratio_value: 100,
		safe_margin_max: 0.20,
		safe_margin_min: 0.05,
		safe_margin_offset: 0.005,
		days_per_month: 31,
		quote_delay: 600 // in millisecond
	};
	
	const _generateSafeMargins = function(){
		let sm = _conf.safe_margin_min;
		while(sm < _conf.safe_margin_max){
			_conf.best.safe_margins.push(sm);
			sm += _conf.safe_margin_offset;
		}
	}
	
	const _getLastMonthDailyCandles = function(config){
		const url = `${_conf.td.api_get_data}${config.ticker}/${_conf.td.api_pricehistory}`;
		return $.ajax({
			url: url,
			type: 'GET',
			async: true,
			data: {
				apikey: _conf.td.api_key,
				periodType: 'month',
				period: 1,
				frequencyType: 'daily',
				frequency: 1,
				needExtendedHoursData: false
			}
		});
	}
	
	/*
	 * date window is from today to next month.
	*/
	const _getOptions = function(config) {
		console.log(config.tick.toUpperCase());
		const today = new Date();
		const fromDate = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
		if(api.conf.weekly){
			// two weeks
			today.setDate(today.getDate() + _conf.weekly_max_days_to_exp);
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
		if(optionData.totalVolume == 0){
			return;
		}
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
				arorc: arorc,
				volumn: optionData.totalVolume
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

	_generateSafeMargins();	
	
	return {
		conf: _conf,
		getOptions: _getOptions,
		quoteTicker: _quoteTicker,
		getLastMonthDailyCandles: _getLastMonthDailyCandles,
		calBestOnSafeMargin: _calBestOnSafeMargin,
		calRORC: _calRORC,
		calARORC: _calARORC,
		round: _round,
		toPercentage: _toPercentage,
		isInSafeMargin: _isInSafeMargin,
		sleep: _sleep
	}
})();

