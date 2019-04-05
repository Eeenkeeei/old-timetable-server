const restify = require('restify');
const {BadRequestError, NotFoundError, InvalidCredentialsError, UnauthorizedError} = require('restify-errors');
const MongoClient = require("mongodb").MongoClient;
const rjwt = require('restify-jwt-community');
const jwt = require('jsonwebtoken');
const config = require('./config');
const user = require('./user');
const watershed = require('watershed');
const server = restify.createServer({handleUpgrades: true});
const ws = new watershed.Watershed();

server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());

server.use(rjwt(config.jwt).unless({
    path: ['/auth', '/registration', '/updateData', '/websocket/attach', '/timetableUpdate', '/sync', '/changePassword'],
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
    user.authenticate(username, password).then((data, e) => {
        try {
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
            next()
        } catch (e) {
            return next(new InvalidCredentialsError());
        }

    });

});
let resultFlag = '';

server.post('/timetableUpdate', (req, res, next) => {
    console.log('UPDATE DATA');
    let userData = req.body;
    console.log(userData);

// todo: валидация
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
            noteTags: req.noteTags,
            timetable: req.body.timetable,
            readLater: req.body.readLater,
            tasks: req.body.tasks,
            notes: req.body.notes,
            lessonsTimetable: req.body.lessonsTimetable,
            startPage: req.body.startPage,
            support: req.body.support,
            lecturers: req.body.lecturers
        });
        resultFlag = 'Timetable Updated';
        console.log(resultFlag);
        res.send(resultFlag);
    });
    next();
});

server.post('/changePassword', (req, res, next) => {
    console.log('CHANGE PASSWORD');
    let userData = req.body;
    let oldPassword = req.body.oldPassword;
    let newPassword = req.body.newPassword;
    let confirmNewPassword = req.body.confirmNewPassword;
    if (newPassword.length < 7) {
        console.log('Длина пароля меньше 8');
        res.send('Bad password length');
        next();
        return;
    }
    if (newPassword !== confirmNewPassword) {
        console.log('Пароли не совпадают');
        res.send('Bad confirm');
        next();
        return;
    }
    mongoClient.connect(async function (err, client) {
        const db = client.db("heroku_hw9cvg3q");
        const collection = db.collection("users");
        collection.find({username: req.body.username}).toArray(function (err, result) {
            if (result.length !== 0) {
                userData = result[0];
                if (newPassword === userData.password) {
                    console.log('Старый и новый пароль совпадает');
                    res.send('Passwords matches');
                    next();
                    return;
                }
                if (userData.password === oldPassword) {
                    console.log('Пароль обновлен');
                    let newData = {
                        username: userData.username,
                        password: confirmNewPassword
                    };
                    collection.updateOne({username: userData.username}, {$set: {password: confirmNewPassword}});
                    console.log(newData);
                    res.send('Updated');
                    return;
                } else {
                    console.log('Старый пароль не совпадает');
                    res.send('Not confirmed');
                    return;
                }

            }
        });
    });
    console.log(userData);
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
            noteTags: req.noteTags,
            timetable: req.body.timetable,
            readLater: req.body.readLater,
            tasks: req.body.tasks,
            notes: req.body.notes,
            lessonsTimetable: req.body.lessonsTimetable,
            startPage: req.body.startPage,
            support: req.body.support,
            lecturers: req.body.lecturers
        });
        resultFlag = 'Data updated';
        console.log(resultFlag);
        res.send(resultFlag);
    });
    next();
});

let timetable = [];
server.post('/registration', (req, res, next) => {
    console.log('Пришел объект:');
    console.log(req.body);
    let user = {
            username: req.body.nickname, password: req.body.password, edu: req.body.edu,
            email: req.body.email, gender: req.body.gender, age: req.body.age,
            timetable,
            readLater: [{linkName: "name", linkTag: "tags", link: "link", done: "done"}],
            tasks: [],
            notes: [],
            noteTags: [
                {
                    tagText: 'Важное',
                    tagClass: 'danger'
                },
                {
                    tagText: 'Среднее',
                    tagClass: 'warning'
                },
                {
                    tagText: 'Не срочно',
                    tagClass: 'success'
                }
            ],
            lessonsTimetable: [
                {
                    start: '8:00',
                    end: '9:30',
                    number: 'first'
                },
                {
                    start: '9:40',
                    end: '11:10',
                    number: 'second'
                },
                {
                    start: '11:20',
                    end: '12:50',
                    number: 'third'
                },
                {
                    start: '13:30',
                    end: '15:00',
                    number: 'fourth'
                },
                {
                    start: '15:10',
                    end: '16:40',
                    number: 'fifth'
                },
                {
                    start: '16:50',
                    end: '18:20',
                    number: 'sixth'
                }
            ],
            startPage: 'account.html',
            support: [],
            lecturers: []
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
        resultFlag = 'Bad Request';
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
let acceptedUsername;

server.get('/updateData', (req, res, next) => {
    if (!res.claimUpgrade) {
        next(new Error('Connection Must Upgrade For WebSockets'));
        return;
    }
    const upgrade = res.claimUpgrade();
    const shed = ws.accept(req, upgrade.socket, upgrade.head);

    shed.on('text', function (msg) {
        acceptedUsername = msg;
        console.log('User: ' + msg);
        const response = {
            username: acceptedUsername,
            msg: "Update"
        };
        shed.send(JSON.stringify(response));
    });

    next(false);
});

server.get('/sync', (req, res, next) => {
    if (!res.claimUpgrade) {
        next(new Error('Connection Must Upgrade For WebSockets'));
        return;
    }
    const upgrade = res.claimUpgrade();
    const shed = ws.accept(req, upgrade.socket, upgrade.head);

    const response = {
        username: acceptedUsername,
        msg: "Update"
    };
    shed.send(JSON.stringify(response));
    next(false);
});


server.listen(port, () => {
    console.log('server started');

});


// todo:
//
// const clients = new Set();
//
// server.get('/', (req, res, next) => {
//     res.send('hello world');
// });
//
// server.get('/ws', (req, res, next) => {
//     if (!res.claimUpgrade) {
//         next(new Error('Connection Must Upgrade For WebSockets'));
//         return;
//     }
//     const upgrade = res.claimUpgrade();
//     const shed = ws.accept(req, upgrade.socket, upgrade.head);
//
//     console.log('client connected');
//
//     clients.add(shed);
//     shed.on('text', () => {
//         console.log('client send something');
//     });
//
//     shed.on('end', () => {
//         console.log('client disconnected');
//         clients.delete(shed);
//         console.log(clients.size);
//     });
//
//     next(false);
// });
//
// setInterval(() => {
//     for (const client of clients) {
//         client.send(`clients count: ${clients.size}`);
//     }
// }, 5000);
//
// const port = process.env.PORT || 7777;
// server.listen(port, () => {
//     console.log('server started');
// });

