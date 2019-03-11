const MongoClient = require("mongodb").MongoClient;

const url = "mongodb://eeenkeeei:shiftr123@ds163825.mlab.com:63825/heroku_hw9cvg3q";
const mongoClient = new MongoClient(url, { useNewUrlParser: true });
mongoClient.connect(function(err, client) {
    const db = client.db("heroku_hw9cvg3q");
    const collection = db.collection("users1");
    let user = {name: "Tom", age: 23};
    collection.insertOne(user, function (err, result) {
        if (err) {
            return console.log(err);
        }
        // взаимодействие с базой данных
        client.close();
    })
});