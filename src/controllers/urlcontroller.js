const urlModel = require("../models/urlModel")
const validUrl = require('valid-url')
const shortid = require('shortid')
const redis = require("redis");
const {promisify} = require("util");

//Connect to redis
const redisClient = redis.createClient(
    13152,
    "redis-13152.c8.us-east-1-4.ec2.cloud.redislabs.com", {
        no_ready_check: true
    }
);
redisClient.auth("uzfxUD5sqIH3bvSxpbrfyktmcZHqtFHJ", function (err) {
    if (err) throw err;
});

redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});



//1. connect to the server
//2. use the commands :

//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

let isValidRequestBody = function (body) {
    if (Object.keys(body).length === 0) return false;
    return true;
}


const createUrl = async (req, res) => {
    try {
        let body = req.body
        if (!isValidRequestBody(body)) {
            return res.status(400).send({status: false, message: "Please provide details in body"})
        }

        const { longUrl } = body;

        if (!validUrl.isUri(longUrl)) {
            return res.status(400).send({status: false, message: "Enter a valid url"})
        }

        const urlCode = shortid.generate().toLowerCase()
        const shortUrl = 'http://localhost:3000/' + urlCode

        let result = {
            urlCode: urlCode,
            longUrl: longUrl,
            shortUrl: shortUrl
        }

        const checkUrl_Code = await urlModel.findOne({ urlCode: urlCode, shortUrl: shortUrl })

        if (checkUrl_Code) {
            if (checkUrl_Code.urlCode == urlCode)
                return res.status(400).send({status: false, message: "urlCode already registered"})
            if (checkUrl_Code.shortUrl == shortUrl)
                return res.status(400).send({status: false, message: "shortUrl already registered"})
        }

        let url = await GET_ASYNC(`${longUrl}`)
        if (url) {
            return res.status(201).send({status: true, data: JSON.parse(url)})
        }

        let dbUrl = await urlModel.findOne({longUrl: longUrl}).select({ __v: 0, _id: 0, createdAt: 0, updatedAt: 0 })

        if(dbUrl) return res.status(201).send({ status: true, data: dbUrl })

        let data = await urlModel.create(result)
        if (data) {
            await SET_ASYNC(`${longUrl}`, JSON.stringify(result))
            return res.status(201).send({status: true, message: "created Successfully", data: result})
        }
    } 
    catch (error) {
        res.status(500).send({
            status: false,
            msg: error.message
        })
    }
}

const fetchUrl = async function (req, res) {
    let url = await GET_ASYNC(`${req.params.urlCode}`)
    if (!url) {
        let check = await urlModel.findOne({urlCode: req.params.urlCode});
        if (!check) return res.status(404).send({status: false, msg: "Url not found"})
        await SET_ASYNC(`${req.params.urlCode}`, check.longUrl)
        console.log("I am inside db call")
        return res.redirect(check.longUrl)
    }
    console.log("I am from redis")

    return res.redirect(url)

};

module.exports.createUrl = createUrl
module.exports.fetchUrl = fetchUrl;

