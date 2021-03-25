const DBClient = require('./DBClient');
const Utility = require('../utility/Utility');

class PatternRepository {
    constructor(){
        this.patternCollectionName = 'patterns';
    }

    insert(patternObj) {
        patternObj.insert_date = Utility.formatLocalDate(new Date(), true);
        DBClient.getCollection(this.patternCollectionName).then(collection => collection.insertOne(patternObj));
    }
}

module.exports = PatternRepository;