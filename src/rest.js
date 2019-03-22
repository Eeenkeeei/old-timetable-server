const restify = require('restify');
const {BadRequestError, NotFoundError, InvalidCredentialsError} = require('restify-errors');
const MongoClient = require("mongodb").MongoClient;
const rjwt = require('restify-jwt');
const jwt = require('jsonwebtoken');
const config = require('./config');
const user = require('./user');
const watershed = require('watershed');
const server = restify.createServer({handleUpgrades: true});
const serveStatic = require('serve-static-restify');
const ws = new watershed.Watershed();

server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());

server.use(rjwt(config.jwt).unless({
    path: ['/auth', '/registration', '/updateData', '/websocket/attach', '/timetableUpdate'],
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
    let {username, password} = req.body;
    console.log(username, password);
    user.authenticate(username, password).then(data => {
        console.log(data);
        if (data === null) {
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
let resultFlag = '';

server.post('/timetableUpdate', (req, res, next) => {
    console.log('UPDATE DATA');
    let userData = req.body;
    console.log(userData);
    console.log(userData.username);


    mongoClient.connect(function (err, client) {
        const db = client.db("heroku_hw9cvg3q");
        const collection = db.collection("users");
        collection.replaceOne({username: userData.username}, {
            username: req.body.username,
            password: req.body.password,
            email: req.body.email,
            edu: req.body.edu,
            gender: req.body.gender,
            age: req.body.age,
            timetable: req.body.timetable,
            readLater: req.body.readLater,
            tasks: req.body.tasks,
            notes: req.body.notes
        });
        resultFlag = 'Data updated';
        console.log(resultFlag);
        res.send(resultFlag);
    });
    next();
});

server.post('/updateData', (req, res, next) => {
    console.log('UPDATE DATA');
    let userData = req.body;
    console.log(userData);
    if (isNaN(req.body.age) === true) {
        console.log('В возрасте не число');
        resultFlag = 'Bad Request(age)';
        res.send(resultFlag);
        next();
        return;
    }

    mongoClient.connect(function (err, client) {
        const db = client.db("heroku_hw9cvg3q");
        const collection = db.collection("users");
        collection.replaceOne({username: userData.username}, {
            username: req.body.username,
            password: req.body.password,
            email: req.body.email,
            edu: req.body.edu,
            gender: req.body.gender,
            age: req.body.age,
            timetable: req.body.timetable,
            readLater: req.body.readLater,
            tasks: req.body.tasks,
            notes: req.body.notes
        });
        resultFlag = 'Data updated';
        console.log(resultFlag);
        res.send(resultFlag);
    });
    next();
});

let timetable = [

];
server.post('/registration', (req, res, next) => {
    console.log('Пришел объект:');
    console.log(req.body);
    let user = {
            username: req.body.nickname, password: req.body.password, edu: req.body.edu,
            email: req.body.email, gender: req.body.gender, age: req.body.age,
            timetable,
        readLater: [{linkName: "name", linkTag: "tags", link: "link", done: "done"}],
        tasks: [{taskName: "name", done: "done"}, {taskName: "name1", done: "done"}],
        notes: [{noteName: "noteName1", note: "note text"}]
}
    ;

    if (req.body.password !== req.body.passwordConfirm) {
        console.log('Пароли не совпадают');
        resultFlag = 'Bad Password';
        res.send(resultFlag);
        next();
        return;
    }

    if (isNaN(req.body.age) === true) {
        console.log('В возрасте не число');
        resultFlag = 'Bad Request(age)';
        res.send(resultFlag);
        next();
        return;
    }

    if (user.username.length < 4 || user.password.length < 7) {
        console.log('Не удовл. условиям');
        resultFlag = 'Bad Request'; // отправит bad Request если нарушены условия по длине
        res.send(resultFlag);
        next();
        return;
    }

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

server.get('/websocket/attach', function (req, res, next) {
    if (!res.claimUpgrade) {
        next(new Error('Connection Must Upgrade For WebSockets'));
        return;
    }
    console.log("upgrade claimed");

    const upgrade = res.claimUpgrade();
    const shed = ws.accept(req, upgrade.socket, upgrade.head);

    shed.on('text', function (msg) {
        console.log('Received message from websocket client: ' + msg);
    });

    shed.send('Сообщение');

    next(false);
});

server.get('/test', restify.plugins.serveStatic({
    directory: './static',
    default: 'index.html'
}));

server.listen(port, () => {
    console.log('server started');

});
