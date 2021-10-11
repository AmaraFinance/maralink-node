let express = require('express');
let router = express.Router();
let txController = require('./http-tx');

router.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Authorization");
    next();
});

router.get('/getTransaction', txController.getTransaction);
router.get('/getPeerCount', txController.getPeerCount);

module.exports = router;