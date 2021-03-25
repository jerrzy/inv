// complex
{
    $match: {
       'quote_date': '2021-03-22',
       'underlyingPrice': {$lt: 100}
     },
     $lookup: {
       from: 'tickers',
       localField: 'symbol',
       foreignField: 'ticker',
       as: 'ticker'
     },
     $match:{
       'ticker': {
         $elemMatch: {'fundamental.marketCap': {$gt: 2000000}}
       }
     },
     $project:{
       symbol: 1,
       underlyingPrice: 1,
       flat_option_chain: 1
     },
     $unwind:{
       path: '$flat_option_chain'
     },
     $project: {
       symbol: 1,
       underlyingPrice: 1,
       mark: '$flat_option_chain.mark',
       bid: '$flat_option_chain.bid',
       ask: '$flat_option_chain.ask',
       volume: '$flat_option_chain.totalVolume',
       strike: '$flat_option_chain.strikePrice',
       upperSafeMarginPrice: {$multiply: ['$underlyingPrice', 0.9]},
       lowerSafeMarginPrice: {$multiply: ['$underlyingPrice', 0.8]},
       daysRemaining: '$flat_option_chain.daysToExpire' 
     },
     $match:{
       $and: [
         {$expr: {$gt: ['$strike', '$lowerSafeMarginPrice']}},
         {$expr: {$lt: ['$strike', '$upperSafeMarginPrice']}},
         {daysRemaining: {$gt: 5}},
         {daysRemaining: {$lt: 14}}, 
         {volume: {$gt: 0}}
       ]
     },
     $project: {
       ticker: '$symbol',
       price: '$underlyingPrice',
       upper: '$upperSafeMarginPrice',
       lower: '$lowerSafeMarginPrice',
       strike: 1,
       mark: 1,
       volume: 1,
       rorc: {$divide: ['$mark', '$strike']}
     },
     $sort: {
       'rorc': -1 
     }
   
   }