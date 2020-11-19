$(function(){
	const loadTickerOption = function(ticker) {
		console.log(ticker);
		api.getOptions({
			tick: ticker
		}).done(function(data){
			// console.log(data);
			// loadOptions(data);
			calBestSMOptions(data);
			loadBestSMOptions();
		}).fail(function(error){
			console.log(error);
		});
	}
	
	const loadTickers = function(){
		$('#tickers').empty();
		let tickers = [];
		// default tickers
		const defaultTickers = api.conf.best.default_ticker_list;
		defaultTickers.forEach(ticker => {
			if(!tickers.includes(ticker)){
				tickers.push(ticker);
			}
		});
		// tickers in the storage
		const storedTickers = localStorage.getItem('tickers');
		storedTickers.split(',').forEach(ticker => {
			if(!tickers.includes(ticker)){
				tickers.push(ticker);
			}
		});
		
		localStorage.setItem('tickers', tickers);
		// show tickers
		$('#ticker-count').html(tickers.length);
		tickers.forEach(ticker => {
			const tickerTemplate = template.getTickerTemplate();
			tickerTemplate.html(ticker);
			$('#tickers').append(tickerTemplate);
		});
		
		api.conf.best.default_ticker_list = tickers;
	}
	
	const calBestSMOptions = function(data){
		$.each(data.putExpDateMap, function(expirationDate, optionData){
			$.each(optionData, function(index, item){
				let rowData = item[0];
				const underlyingPrice = data.underlyingPrice;
				// skip option with zero mark
				if(api.isInSafeMargin(underlyingPrice, rowData.strikePrice)  && rowData.mark){
					rowData.safeMarginRatio = (underlyingPrice - rowData.strikePrice) / underlyingPrice;
					rowData.ticker = data.symbol;
					rowData.underlyingPrice = data.underlyingPrice;
					rowData.ticker = data.symbol;
					api.calBestOnSafeMargin(rowData);
				}
			});
		});
	}
	
	const loadBestSMOptions = function(){
		// container
		let optionChainContainer = template.getOptionChainContainerTemplate();
		Object.keys(api.conf.best.safe_margin_options).forEach(function(days2Exp, index) {
			let optionData = api.conf.best.safe_margin_options[days2Exp];
			$(optionChainContainer).find('[data-field="option-chain-block"]').append(createSMBestOptionsTable(days2Exp, optionData));
		});
		$('[data-field="best-sm-option-content"]').html(optionChainContainer);
	}
	
	const createSMBestOptionsTable = function(days2Exp, optionData){
		let topSMTableTemplate = template.getTopSMTableTemplate();
		$(topSMTableTemplate).find('[data-field="basic-info"]').html('Top ' + api.conf.best.show_top_k + ' Options');
		$(topSMTableTemplate).find('[data-field="days-to-exp"]').html(days2Exp + ' days left');
		
		$.each(optionData, function(sm, smSortedItems){
			let rowTemplate = template.getTopSMRowTemplate();
			// first column is safe margin ratio(how far from the stike)
			$(rowTemplate).find('[data-field="sm-ratio"]').html(api.toPercentage(sm));
			// traverse k choices
			let count = 0;
			$.each(smSortedItems, function(index, smItem){
				if(count < api.conf.best.show_top_k){					
					let topKMSTemplate = template.getTopKMSTemplate();
					topKMSTemplate.find('[data-field="ticker"]').html(smItem.ticker);
					topKMSTemplate.find('[data-field="strike"]').html(smItem.strike + '-' + smItem.mark);
					topKMSTemplate.find('[data-field="arorc"]').html(api.toPercentage(smItem.arorc));
					$(rowTemplate).find('[data-field="sm-info"]').append(topKMSTemplate);
					count++;
				}
			});
			
			$(topSMTableTemplate).find('tbody').append($(rowTemplate));
		});
		
		return topSMTableTemplate;
	}
	
	const createOptionRow = function(index, optionRowData){
		const mark = optionRowData['mark'];
		const strikePrice = optionRowData.strikePrice;
		const daysToExpiration = optionRowData.daysToExpiration;
		const rorc = api.calRORC(mark, strikePrice);
		const arorc = api.calARORC(rorc, daysToExpiration);
		// index is current price
		let rowTemplate = template.createOptionRowTemplate();
		$(rowTemplate).find('[data-field="strike-price"]').html(strikePrice);
		$(rowTemplate).find('[data-field="safe-margin-ratio"]').html(api.toPercentage(optionRowData.safeMarginRatio));
		$(rowTemplate).find('[data-field="mark"]').html(mark);
		$(rowTemplate).find('[data-field="rorc"]').html(api.toPercentage(rorc));
		$(rowTemplate).find('[data-field="arorc"]').html(api.toPercentage(arorc));
		return rowTemplate;
	}

	const loadOptions = function(data){
		// container
		let optionChainContainer = getOptionChainContainerTemplate();
		// basic info
		let basicInfo = createBasicInfo(data);
		$(optionChainContainer).find('[data-field="basic-info-block"]').html(basicInfo);
		$.each(data.putExpDateMap, function(expirationDate, optionData){
			optionData.underlyingPrice = data.underlyingPrice;
			optionData.symbol = data.symbol;
			$(optionChainContainer).find('[data-field="option-chain-block"]').append(createOptionTable(expirationDate, optionData));
		});
		$('[data-field="option-content"]').append($(optionChainContainer).html());
	}
	
	const createBasicInfo = function(data){
		let basicInfoTemplate = $('[data-field="template-basic-info"]').clone();
		$(basicInfoTemplate).find('[data-field="ticker"]').html(data.symbol);
		$(basicInfoTemplate).find('[data-field="price"]').html(api.round(data.underlyingPrice));
		$(basicInfoTemplate).find('[data-field="volatility"]').html(data.volatility);
		return $(basicInfoTemplate).html();
	}
	
	const createOptionTable = function(optionExpDate, optionData){
		let optionTableTemplate = template.getOptionTableTemplate();
		let expDate = optionExpDate.split(':')[0];
		let daysToExp = optionExpDate.split(':')[1] + ' days left';
		$(optionTableTemplate).find('[data-field="exp-date"]').html(expDate);
		$(optionTableTemplate).find('[data-field="days-to-exp"]').html(daysToExp);
		$.each(optionData, function(index, item){
			if(item[0] != undefined){
				// don't know why the option object is in an array.
				let optionRowData = item[0];
				
				const underlyingPrice = optionData.underlyingPrice;
				const safeMarginRatio = (underlyingPrice - optionRowData.strikePrice) / underlyingPrice;
				// skip option with zero mark
				if(api.isInSafeMargin(underlyingPrice, optionRowData.strikePrice)  && optionRowData.mark){
					optionRowData.safeMarginRatio = safeMarginRatio;
					optionRowData.ticker = optionData.symbol;
					optionRowData.underlyingPrice = optionData.underlyingPrice;
					$(optionTableTemplate).find('tbody').append(createOptionRow(index, optionRowData));
				}
			}
		});
		return optionTableTemplate;
	}
	
	$('#add-ticker').on('click', function(){
		let ticker = $('#ticker-input').val();
		if(ticker){
			ticker = ticker.toUpperCase();
			// check existance
			if(api.conf.best.default_ticker_list.includes(ticker)){
				$('#ticker-input').val('');
				$('#ticker-input').attr('placeholder', 'Ticker exists');
				return;
			}
			api.quoteTicker(ticker).done(data => {
				if($.isEmptyObject(data)) {
					$('#ticker-input').val('');
					$('#ticker-input').attr('placeholder', 'Ticker not found');
				} else {
					let storedTickers = localStorage.getItem('tickers').split(',');
					if(!storedTickers.includes(ticker)){
						storedTickers.push(ticker);
						localStorage.setItem('tickers', storedTickers)
						$('#ticker-input').val('');
						$('#ticker-input').attr('placeholder', 'Add Ticker');
					
						loadTickers();
						loadTickerOptions();
					}
				}
			}).fail(e => console.error(e));
		}
	});
	
	const loadTickerOptions = function(){
		let ms = 0;		
		$.each(api.conf.best.default_ticker_list, function(index, ticker){
			api.sleep(ms+=200).then(() => loadTickerOption(ticker));
		});
	}
	
	const start = function(){
		loadTickers();
		
		setInterval(function(){
			loadTickerOptions();
		}, 30000);
		loadTickerOptions();
	}
	
	start();
})

