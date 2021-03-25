const OptionApplication = require('./application/OptionApplication');
const TickerLoader = require('./application/TickerLoader');
const VolumeApplication = require('./application/VolumesApplication');
const Utility = require('./utility/Utility');
const DBClient = require('./repository/DBClient');

// class Application{
//     constructor(){
//         this.tickerLoader = new TickerLoader();     
//         this.optionApplication = new OptionApplication();
//         this.volumeApplication = new VolumeApplication();
//     }

//     async run(){
//         // await this.tickerLoader.loadTicker(); // maybe once per month
//         // await this.tickerLoader.updateTicker(); // maybe once per month
//         await this.volumeApplication.process();
//         DBClient.close();
//     }
// }

// app = new Application();
// app.run();
