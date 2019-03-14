"use strict";

// exports.authenticate = (username, password) => {
//     return Promise.resolve({ uid: 1, name: 'Sean', admin: false });
// };
const {BadRequestError, NotFoundError, InvalidCredentialsError} = require('restify-errors');

const MongoClient = require("mongodb").MongoClient;
const url = "mongodb://eeenkeeei:shiftr123@ds163825.mlab.com:63825/heroku_hw9cvg3q";
const mongoClient = new MongoClient(url, {useNewUrlParser: true});


exports.authenticate = (username, password) => {
    return new Promise((resolve, reject) => {
        mongoClient.connect(function (err, client) {
            const db = client.db("heroku_hw9cvg3q");
            const collection = db.collection("users");
            collection.findOne({username, password}, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            })
        });
    });
};