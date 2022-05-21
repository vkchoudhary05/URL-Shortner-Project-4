const express = require('express');
let router = express.Router();
const urlController = require("../controllers/urlController")



router.post("/", (req, res) => {
    res.send('ok')
})

router.post("/url/shorten", urlController.createUrl )
router.get('/:urlCode', urlController.fetchUrl);




module.exports = router;