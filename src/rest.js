const restify = require('restify');
const {BadRequestError, NotFoundError, InvalidCredentialsError} = require('restify-errors');
const MongoClient = require("mongodb").MongoClient;
const rjwt = require('restify-jwt');
const jwt = require('jsonwebtoken');
const config = require('./config');
const user = require('./user');

const server = restify.createServer();
server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());

server.use(rjwt(config.jwt).unless({
    path: ['/auth', '/resultFlag'],
}));

const url = "mongodb://eeenkeeei:shiftr123@ds163825.mlab.com:63825/heroku_hw9cvg3q";
const mongoClient = new MongoClient(url, {useNewUrlParser: true});

server.pre((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // * - разрешаем всем
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { // Preflight
        res.send();
        next(false);
        return;
    }

    next();
});

server.get('/user', (req, res, next) => {
    console.log('GET USER');
    res.send(req.user);
});

server.post('/auth', (req, res, next) => {
    console.log('auth');

    let { username, password } = req.body;
    console.log(username, password);
    user.authenticate(username, password).then(data => {
        console.log(data);
        if (data===null) {
            res.send('Null');
        }
        let token = jwt.sign(data, config.jwt.secret, {
            expiresIn: '15m'
        });

        let {iat, exp} = jwt.decode(token);
        console.log('token', token);
        res.send({iat, exp, token});
    });
});

let items = [];

server.get('/items', (req, res, next) => {
    res.send(items);
    next();
});

let resultFlag = '';

server.post('/resultFlag', (req, res, next) => {
    console.log('Пришел объект:');
    console.log(req.body);
    let user = {username: req.body.nickname, password: req.body.password};
    mongoClient.connect(function (err, client) {
        const db = client.db("heroku_hw9cvg3q");
        const collection = db.collection("users");
        collection.find({username: req.body.nickname}).toArray(function (err, result) {
            if (result.length === 0) {
                resultFlag = 'true';
                console.log(resultFlag);
                console.log('Копий нет');
                collection.insertOne(user, function (err, result) {
                    console.log('Добавлено');
                    if (err) {
                        return console.log(err);
                    }
                });
                res.send(resultFlag);

            } else {
                resultFlag = 'false';
                console.log(resultFlag);
                console.log('Есть копия, не добавлено');
                res.send(resultFlag);

                if (err) {
                    return console.log(err);
                }
            }
        });
    });
    next();
});

const port = process.env.PORT || 7777;

server.listen(port, () => {
    console.log('server started');

});