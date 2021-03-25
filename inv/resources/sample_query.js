// for big volume
{ 'insert_date': '2021-03-11', 'ETF': false, 'detail.green': true, 'detail.howManyTimesBigger': { $gt: 5 } }

// for option
[
  {
    '$match': {
      left_date: '2021-03-15',
      ticker: { $nin: ['SPY', 'QQQ', 'EEM', 'XLE', 'XLF'] },
      optionType: 'CALL',
      'statistics.volume.increased_to_sharesout_ratio': { '$gt': 0.03 },
      'statistics.open_interest.increased_to_sharesout_ratio': { '$gt': 0.03 }
    }
  }, {
    '$sort': {
      'statistics.volume.increased': -1
    }
  }, {
    '$project': {
      'ticker': 1,
      'optionType': 1,
      'volume_ratio': '$statistics.volume.to_sharesout_ratio',
      'open_interest_ratio': '$statistics.open_interest.to_sharesout_ratio',
      'v_changes': {
        '$filter': {
          'input': '$statistics.change',
          'as': 'result',
          'cond': {
            '$gt': [
              '$$result.volumeChange', 10000
            ]
          }
        }
      },
      'oi_changes': {
        '$filter': {
          'input': '$statistics.change',
          'as': 'result',
          'cond': {
            '$gt': [
              '$$result.openInterestChange', 10000
            ]
          }
        }
      }
    }
  }, {
    '$count': 'number'
  }
]

// to strip off time from date
aggregate([{
  $project: {
    'date_of_datetime':
    {
      $arrayElemAt: [
        { $split: ['$insert_date', ' '] }
        , 0]
    }
  }
}, {
  $set: {
    'quote_date': '$date_of_datetime'
  }
}]);

// WARNINIG! DO NOT apply $project to updateMany, it deletes all other fields excpet the projected field!
db.callOptions.updateMany({}, [{
  $project: {
    'date_of_datetime':
    {
      $arrayElemAt: [
        { $split: ['$insert_date', ' '] }
        , 0]
    }
  }
}, {
  $set: {
    'quote_date': '$date_of_datetime'
  }
}]);


// WARNINIG! DO NOT apply $project to updateMany, it deletes all other fields excpet the projected field!
db.putOptions.updateMany({}, [
  {
    $set: { 'quote_date': { $arrayElemAt: [{ $split: ['$insert_date', ' '] }, 0] } }
  }
]);


