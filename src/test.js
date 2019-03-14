const restify = require('restify');
const rjwt = require('restify-jwt');
const jwt = require('jsonwebtoken');
const config = require('./config');
const user = require('./user');
const server = restify.createServer();


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

server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());
server.use(rjwt(config.jwt).unless({
    path: ['/auth']
}));

server.get('/user', (req, res, next) => {
    res.send(req.user);
});

server.post('/auth', (req, res, next) => {
    let { username, password } = req.body;
    user.authenticate(username, password).then(data => {
        let token = jwt.sign(JSON.parse(JSON.stringify(data)), config.jwt.secret, {
            expiresIn: '1m'
        });

        let {iat, exp} = jwt.decode(token);
        res.send({iat, exp, token});
    })
});

server.listen(8080, () => {
    console.log('%s listening at %s', server.name, server.url);
});