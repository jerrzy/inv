var tickerLoader = (function(){
	let _nasdaqlistedFile = '/resources/nasdaqlisted.txt';
	
	let _getTickers = function(){
		return _getTickersFromLocalFile();
	}
	
	let _getTickersFromLocalFile = function(){
		fetch(_nasdaqlistedFile)
		  .then(response => response.text())
		  .then(text => console.log(text))
	}
	
	return {
		getTickers : _getTickers
	}
})()