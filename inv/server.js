const express = require('express');
const bodyParser = require('body-parser');
// Create application/x-www-form-urlencoded parser
const urlencodedParser = bodyParser.urlencoded({ extended: false })
const ShortPutService = require('./service/ShortPutService');

const app = express();
app.use(express.static('public'));

app.get('/', (req, res) => {
});

app.post('/shortPutRank', urlencodedParser, (req, res) => {
    new ShortPutService().getShortPutRank(req, res);
});

const server = app.listen(8081, () => {
    const host = server.address().address;
    const port = server.address().port;

    console.log("Example app listening at http://%s:%s", host, port)
});