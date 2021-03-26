const TDDataService = require('../service/TDDataService');
const Utility = require('../utility/Utility');
const lineReader = require('line-reader');
const TickerRepository = require('../repository/TickerRepository');

class TickerLoader {
	constructor() {
		this.tDDataService = new TDDataService();
		this.tickerRepository = new TickerRepository();
	}

	loadTicker() {
		let index = 0
		lineReader.eachLine('./resources/nasdaqtraded.txt', async (line, last) => {
			// console.log(line);
			if (index != 0) {
				let tickerInfo = line.split('|');
				const tickerObj = {
					ticker: tickerInfo[1], // ticker
					name: tickerInfo[2], // name
					ETF: tickerInfo[5],
					insert_date: Utility.getToday()
				};
				const existingTicker = await this.tickerRepository.findOne({
					ticker: tickerObj.ticker
				});
				if (existingTicker) {
					console.log(`${tickerObj.ticker} exists.`);
				} else {
					this.tickerRepository.insertOne(tickerObj);
					console.log(`${tickerObj.ticker} added.`);
				}
			}
			index++;

			if (last) {
				this.dbConnector.closeMongo();
			}
		});
	}

	async updateTicker() {
		let index = 0;
		// let interval = 0;

		const tickerArr = [];
		await lineReader.eachLine('./resources/nasdaq_screener_1616720785418.csv', async (line, last) => {
			// console.log(line);
			if (index != 0) {
				let tickerInfo = line.split(',');
				const ticker = tickerInfo[0];
				const name = tickerInfo[1];
				const sector = tickerInfo[9];
				const industry = tickerInfo[10];
				tickerArr.push({
					'ticker': ticker,
					'sector': sector,
					'industry': industry,
					'name': name
				});
			}

			if(last) {
				await this.update(tickerArr);
				DBClient.close();
			}
			index++;
		});
	}


	async update(tickerArr) {
		for(let i = 0; i < tickerArr.length; i++) {
			const tickerObj = tickerArr[i];
			const existingTicker = await this.tickerRepository.getTickerObj(tickerObj.ticker);
			if (existingTicker) {
				// update sector & industry
				this.tickerRepository.update(tickerObj.ticker, {
					'sector': tickerObj.sector,
					'industry': tickerObj.industry
				});
			} else {
				this.tickerRepository.insert({
					'ticker': tickerObj.ticker,
					'name': tickerObj.name,
					'sector': tickerObj.sector,
					'industry': tickerObj.industry
				});
				// console.log(`${tickerObj.ticker} does not exist!`);
			}
		}
	}
}

module.exports = TickerLoader;


/**
 * unused code
await Utility.sleep(interval+=1000);
update fundamental
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
if(existingTicker){
this.tickerCollection.updateOne({ticker: tickerObj.ticker}, {
	$set: {
		ETF: tickerObj.ETF
	}
});
}
 */