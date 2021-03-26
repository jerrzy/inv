const OptionRepository = require('../repository/OptionRepository');

class ShortPutService {
    constructor() {
        this.optionRepository = new OptionRepository();
    }

    async getShortPutRank(req, res) {
        const query = req.body.query;
        if(query) {
            const queryObj = JSON.parse(query);
            const ret = await this.optionRepository.queryAggregate(queryObj);
            res.end(JSON.stringify(ret));
        }
    }
}

module.exports = ShortPutService;