$(function(){
	const loadTickerOption = function(ticker) {
		// console.log(ticker);
		api.getOptions({
			tick: ticker
		}).done(function(data){
			// discard data with wrong days-to-exp
			if(data.daysToExpiration > api.conf.weekly_max_days_to_exp){
				return;
			}
			calBestSMOptions(data);
			loadBestSMOptions();
			// unmute the ticker element
			// mute tickers waiting for update
			$('[data-ticker="' + ticker + '"]').removeClass('badge-secondary').addClass('badge-dark');
		}).fail(function(error){
			console.log(error);
		});
	}
	
	const loadTickers = function(){
		$('#tickers').empty();
		
		let tickers = [];
		// default tickers
		const defaultTickers = api.conf.best.default_ticker_list;
		if(defaultTickers){
			defaultTickers.forEach(ticker => {
				if(!tickers.includes(ticker)){
					tickers.push(ticker);
				}
			});	
		}
		// tickers in the storage
		const storedTickers = localStorage.getItem('tickers');
		if(storedTickers){
			storedTickers.split(',').forEach(ticker => {
				if(!tickers.includes(ticker)){
					tickers.push(ticker);
				}
			});	
		}		
		localStorage.setItem('tickers', tickers);
		// show tickers
		$('#ticker-count').html(tickers.length);
		tickers.forEach(ticker => {
			const tickerTemplate = template.getTickerTemplate();
			const tickerDetail = getTickerDetail(ticker);
			tickerTemplate.html(ticker);			
			tickerTemplate.attr('data-ticker', ticker);
			tickerTemplate.attr('title', tickerDetail);
			tickerTemplate.removeClass('badge-dark').addClass('badge-secondary');
			$('#tickers').append(tickerTemplate);
		});
		//
		$('[data-toggle="tooltip"]').tooltip();
		api.conf.best.default_ticker_list = tickers;
	}
	
	const getTickerDetail = function(ticker){
		const tickerDetail = localStorage.getItem(ticker);
		if(!tickerDetail){
			api.quoteTicker(ticker).done(data => {
				localStorage.setItem(ticker, data[ticker].description);
			}).fail(error => console.log(error));
		}
		return localStorage.getItem(ticker);
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
					// highlight arorc greater than 50%
					if(smItem.arorc >= 0.2 && smItem.arorc < 0.5){
						topKMSTemplate.find('[data-field="arorc"]').removeClass('badge-secondary').addClass('badge-success');
					} else if(smItem.arorc > 0.5){
						topKMSTemplate.find('[data-field="arorc"]').removeClass('badge-secondary').addClass('badge-warning');
					}
					topKMSTemplate.find('[data-field="volumn"]').html(smItem.volumn);
					if(smItem.volumn != 0){
						topKMSTemplate.find('[data-field="volumn"]').removeClass('badge-secondary').addClass('badge-success');
					}
					$(rowTemplate).find('[data-field="sm-info"]').append(topKMSTemplate);
					count++;
				}
			});
			
			$(topSMTableTemplate).find('tbody').append($(rowTemplate));
		});
		
		return topSMTableTemplate;
	}
	
	$('#add-ticker').on('click', function(){
		let ticker = $('#ticker-input').val();
		if(ticker){
			ticker = ticker.toUpperCase();
			// check existance
			if(api.conf.best.default_ticker_list.includes(ticker)){
				$('#ticker-input').val('');
				$('#ticker-input').attr('placeholder', 'Ticker: ' + ticker + ' exists');
				$('#ticker-input').focus();
				return;
			}
			api.quoteTicker(ticker).done(data => {
				if($.isEmptyObject(data)) {
					$('#ticker-input').val('');
					$('#ticker-input').attr('placeholder', 'Ticker: ' + ticker + ' not found');
					$('#ticker-input').focus();
				} else {
					let storedTickers = localStorage.getItem('tickers').split(',');
					if(!storedTickers.includes(ticker)){
						storedTickers.push(ticker);
						localStorage.setItem('tickers', storedTickers)
						$('#ticker-input').val('');
						$('#ticker-input').attr('placeholder', 'Ticker: ' + ticker + ' Added');
						$('#ticker-input').focus();
						loadTickers();
						// loadTickerOptions();
					}
				}
			}).fail(e => console.error(e));
		}
	});

	const addHighlight = function(ticker){
		const target = $('[data-ticker="' + ticker + '"]');
		if(target.length == 0){
			return;
		}
		
		$('[data-ticker]').removeClass('highlight');
		target.addClass('highlight');
	}
	
	const loadTickerOptions = function(){
		$('[data-ticker]').removeClass('badge-dark').addClass('badge-secondary');
		let ms = 0;		
		$.each(api.conf.best.default_ticker_list, function(index, ticker){
			api.sleep(ms+=api.conf.quote_delay).then(() => loadTickerOption(ticker));
		});
	}
	
	const start = function(){
		loadTickers();
		
		setInterval(function(){loadTickerOptions();}, api.conf.quote_delay * (api.conf.best.default_ticker_list.length + 1));
		loadTickerOptions();
	}
	
	start();
})

