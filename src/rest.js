const restify = require('restify');
const { BadRequestError, NotFoundError } = require('restify-errors');
const MongoClient = require("mongodb").MongoClient;



const server = restify.createServer();
server.use(restify.plugins.bodyParser());

const url = "mongodb://eeenkeeei:shiftr123@ds163825.mlab.com:63825/heroku_hw9cvg3q";
const mongoClient = new MongoClient(url, { useNewUrlParser: true });
mongoClient.connect(function(err, client) {
    const db = client.db("heroku_hw9cvg3q");
    let collection = db.collection("users1");
    console.log('CONNECTED TO MONGO');
});

server.pre((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // * - разрешаем всем
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { // Preflight
        res.send();
        next(false);
        return;
    }

    next();
});


let items = [];

server.get('/items', (req, res, next) => {
    res.send(items);
    next();
});

server.post('/items', (req, res, next) => {
    console.log('ADD');
    console.log(req.body);
    let user = {name: req.body.nickname, password: req.body.password};
    mongoClient.connect(function(err, client) {
        const db = client.db("heroku_hw9cvg3q");
        let collection = db.collection("users1");
        console.log('CONNECTED TO MONGO');
        collection.insertOne(user, function (err, result) {
            if (err) {
                return console.log(err);
            }
            // взаимодействие с базой данных
        });
    });

    res.send();
    next();
    console.log('ADD');
});

server.post('/items/:item', (req, res, next) => {
    console.log ('EARLY OBJECT', items[req.body.id-1]);
    items[req.body.id-1].name = req.body.name;
    items[req.body.id-1].tag = req.body.tag;
    items[req.body.id-1].link = req.body.link;
    items[req.body.id-1].location = req.body.location;
    console.log ('NEW OBJECT', items[req.body.id-1]);
    console.log('NEW MASSIVE');
    console.log(items);
    res.send();
    next();
});

server.del ('/items', (req, res, next) => {
    items = [];
    console.log('DELETE STARTED');
    res.send();
    next();
});

server.del('/items/:id', (req, res, next) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        return next(new BadRequestError('Invalid id'));
    }

    const index = items.findIndex((value) => {
        return value.id === id;
    });

    if (index === -1) {
        next(new NotFoundError('Item not found'));
        return;
    }
    items.splice(index, 1);
    console.log('NEW MASSIVE');
    console.log(items);
    res.send();
    next();
});

const port = process.env.PORT || 7777;

server.listen(port, () => {
    console.log('server started');

});
