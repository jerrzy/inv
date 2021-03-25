const Utility = require('../utility/Utility');
const { MongoClient } = require("mongodb");

class DBClient{
    static #DB_CLIENT;
    static #INV_DB;
    static #DB_URI = "mongodb://localhost:27017";
    static #INV_DB_NAME = 'inv';

    constructor(){}

    static async getCollection(collectionName) {
        return this.#getDB().then(db => db.collection(collectionName));
    }

    static async logError(errorObj) {
        const errorCollection = await DBClient.getCollection('errors');
        errorObj.insert_datetime = Utility.getTodayDatetime();
        errorCollection.insertOne(errorObj);
    }

    static close() {
        if(DBClient.#DB_CLIENT) {
            DBClient.#DB_CLIENT.close();
            console.log("---Mongo closed---");
        }
    }

    static async #getDB(){
        if(!DBClient.#DB_CLIENT){
            try {
                DBClient.#DB_CLIENT = new MongoClient(DBClient.#DB_URI);
                await DBClient.#DB_CLIENT.connect();
                DBClient.#INV_DB = DBClient.#DB_CLIENT.db(DBClient.#INV_DB_NAME);
                console.log('--- Mongo Initiated ---');
            } catch {
                console.log('---Mongo Initiating error---');
                await DBClient.#DB_CLIENT.close();
            }
        }
        return DBClient.#INV_DB;
    }
}

module.exports = DBClient;