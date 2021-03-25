const TDDataService = require('../service/TDDataService');
const INVDBConnector = require('../repository/DBClient');
const Utility = require('../utility/Utility');
const lineReader = require('line-reader');

class TickerLoader {
	constructor() {
		this.tDDataService = new TDDataService();
		this.dbConnector;
		this.tickerCollection;
	}

	async #initCollections() {
		if (!this.dbConnector) {
			this.dbConnector = await new INVDBConnector();
			this.tickerCollection = await this.dbConnector.getTickerCollection();
		}
	}

	loadTicker() {
		this.#initCollections().then(() => {
			let index = 0
			lineReader.eachLine('./resources/nasdaqtraded.txt', async (line, last) => {
				// console.log(line);
				if(index != 0){
					let tickerInfo = line.split('|');
					const tickerObj = {
						ticker: tickerInfo[1], // ticker
						name: tickerInfo[2], // name
						ETF: tickerInfo[5],
						insert_date: Utility.getToday()
					};
					const existingTicker = await this.tickerCollection.findOne({
						ticker: tickerObj.ticker
					});
					if(existingTicker){
						console.log(`${tickerObj.ticker} exists.`);
					} else {
						this.tickerCollection.insertOne(tickerObj);
						console.log(`${tickerObj.ticker} added.`);
					}
				}
				index++;

				if(last){
					this.dbConnector.closeMongo();
				}
			});
		});
	}

	updateTicker() {
		this.#initCollections().then(() => {
			let index = 0;
			let interval = 0;
			lineReader.eachLine('./resources/nasdaqtraded.txt', async (line, last) => {
				// console.log(line);
				if(index != 0){
					let tickerInfo = line.split('|');
					const ticker = tickerInfo[1];
					const existingTicker = await this.tickerCollection.findOne({
						'ticker': ticker
					});

					if(existingTicker) {
						await Utility.sleep(interval+=1000);
						// update fundamental
						const fundamental = await this.tDDataService.getFundamental(ticker);
						try {
							this.tickerCollection.updateOne({'ticker': ticker}, {
								$set: {
									'fundamental': fundamental[ticker].fundamental
								}
							});	
							console.log(`index: ${index} ticker: ${ticker}`);
						} catch (error) {
							console.error(`error index: ${index} ticker: ${ticker}`);
						}
						
					}					

					// if(existingTicker){
					// 	this.tickerCollection.updateOne({ticker: tickerObj.ticker}, {
					// 		$set: {
					// 			ETF: tickerObj.ETF
					// 		}
					// 	});
					// }
				}
				index++;

				if(last){
					this.dbConnector.close();
				}
			});
		});
	}


}

module.exports = TickerLoader;