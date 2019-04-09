"use strict";

const {BadRequestError, NotFoundError, InvalidCredentialsError} = require('restify-errors');

const MongoClient = require("mongodb").MongoClient;
const url = "mongodb://eeenkeeei:shiftr123@ds163825.mlab.com:63825/heroku_hw9cvg3q";
const mongoClient = new MongoClient(url, {useNewUrlParser: true});
const bcrypt = require('bcryptjs');

exports.authenticate = (username, password) => {
    return new Promise((resolve, reject) => {
        mongoClient.connect(function (err, client) {
            const db = client.db("heroku_hw9cvg3q");
            const collection = db.collection("users");
            collection.findOne({username}, (err, data) => { //  в data возвращается объект
                if (err) return reject(err);
                let objectToSend = null;
                if (data !== null) {
                    if (bcrypt.compareSync(password, data.password) === true) {
                        objectToSend = data;
                        // console.log(objectToSend);
                        console.log('OBJECT SEND authenticate');
                        resolve(objectToSend);
                    }
                }
                resolve(objectToSend);
            })
        });
    });
};


exports.returnUpdatedObject = (username, password) => {
    return new Promise((resolve, reject) => {
        mongoClient.connect(function (err, client) {
            const db = client.db("heroku_hw9cvg3q");
            const collection = db.collection("users");
            collection.findOne({username, password}, (err, data) => { //  в data возвращается объект
                if (err) return reject(err);
                let objectToSend = null;
                if (data !== null) {
                    if (password === data.password) {
                        objectToSend = data;
                        console.log('OBJECT SEND returnUpdatedObject')
                    }
                    if (password !== data.password) {
                        console.log('Старый пароль был изменен');
                    }
                }
                resolve(objectToSend);
            })
        });
    });
};
