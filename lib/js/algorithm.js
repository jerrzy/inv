var algorithm = (function(){
	const _getMovingAves = async function(lengthArray){
		let maArray = [];
		await api.getLastMonthDailyCandles({
			ticker: 'FUBO'
		}).done(data => {
			if(length > data.candles.length){
				console.error('wrong length param for MA.');
				return;
			}
			lengthArray.forEach(length => {
				maArray[length] = _calcMA(data.candles, length);	
			});
			
		}).fail(e => console.log(e));
		// console.log(candles);
		
		return maArray;
	}

	const _calcMA = function(candles, length){
		let total = 0;
		let candleCount = candles.length;
		for(let i = candleCount - length; i < candleCount; i++){
			total += candles[i].close;
		}
		return total / length;
	}
	
	return {
		getMovingAves: _getMovingAves
	}
})();