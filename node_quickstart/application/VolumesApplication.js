const Logger = require('../utility/Logger');
const Utility = require('../utility/Utility');
const TDDataService = require('../service/TDDataService');
const VolumeProcessor = require('../processor/ShareProcessor/VolumeProcessor');
const PatternProcessor = require('../processor/ShareProcessor/PatternProcessor');
const TickerRepository = require('../repository/TickerRepository');
const VolumeRepository = require('../repository/VolumeRepository');
const PatternRepository = require('../repository/PatternRepository');

class VolumeApplication {
	constructor() {
		this.tickerRepository = new TickerRepository();
		this.volumeRepository = new VolumeRepository();
		this.tDDataService = new TDDataService();
		this.volumeProcessor = new VolumeProcessor();
		this.patternProcessor = new PatternProcessor();
		this.patternRepository = new PatternRepository();
		this.requestInterval = 400;
		this.hasOption = null;
	}

	async process() {
		const tickers = await this.tickerRepository.getTickers(this.hasOption);

		// this.#updateVolumeToAddETF(tickers)
		for (let i = 0; i < tickers.length; i++) {
			const ticker = tickers[i];
			// candle in 2 years
			const dataObj = await this.tDDataService.getDailyPriceHistory(ticker, 'year', 2);
			if (!dataObj || !dataObj.candles || dataObj.candles.length == 0) {
				Logger.log(ticker, 'No candle');
				continue;
			}
			// 1. volume
			await this.#volumeAnalysis(ticker, dataObj);
			await Utility.sleep(this.requestInterval);
			// 2. pattern
			// await this.#patternAnalysis(ticker, dataObj);
			// await Utility.sleep(this.requestInterval);
		}
	}

	/**
	 * 1. focus on 50 days' candles
	 * 2. check existance by ticker & last_candle_date not insert_date
	 * 
	 * @param {} ticker 
	 */
	async #volumeAnalysis(ticker, dataObj) {
		const lastCandle = dataObj.candles[dataObj.candles.length - 1];
		const lastCandleDate = Utility.formatDate(Utility.epochToDate(lastCandle.datetime));
		const exists = await this.volumeRepository.existsByLastCandleDate(ticker, lastCandleDate);
		if (exists) {
			Logger.log(ticker, 'Volume Statistics exists');
			return;
		}
		const candle50D = dataObj.candles.slice(dataObj.candles.length - 50);
		const result = this.volumeProcessor.process(ticker, candle50D);
		if (result) {
			let tickerInfo = {
				ticker: ticker,
				detail: result
			};
			const isETF = await this.tickerRepository.isETF(ticker);
			tickerInfo.ETF = isETF;
			this.volumeRepository.insert(tickerInfo);
			Logger.log(ticker, 'Volume record added');
		} else {
			Logger.log(ticker, 'no big Volume found');
		}
	}

	/**
	 * focus on two years' daily candles
	 * 
	 * @param {*} ticker 
	 * @returns 
	 */
	async #patternAnalysis(ticker, dataObj) {
		const patternObj = this.patternProcessor.process(ticker, dataObj.candles);
		if (patternObj) {
			this.patternRepository.insert(patternObj);
			Logger.log(ticker, 'w pattern added');
		} else {
			Logger.log(ticker, 'no pattern found');
		}
	}

	/**
	 * Mar 12, 2021. set the ETF flag for volume scan results. 
	 * It seems most ETFs have higher volume so have to mark them for futher process.
	 */
	async #updateVolumeToAddETF(tickers) {
		for (let index in tickers) {
			const ticker = tickers[index];
			const tickerObj = await this.tickerRepository.getTickerObj(ticker);
			if (tickerObj) {
				await this.volumeRepository.update(ticker,);
				await this.dbConnector.updateBigVolumeByTicker(ticker, { 'ETF': tickerObj.ETF });
				Logger.log(ticker, 'Big volume sweep');
			}
		}
		Logger.log(ticker, 'Big volume ticker ETF update completed');
	}
}

module.exports = VolumeApplication;