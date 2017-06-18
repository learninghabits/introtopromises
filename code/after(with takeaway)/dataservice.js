
module.exports = function () {
	var MongoClient = require('mongodb').MongoClient;
    var config = require('./dbconfig.json');
	var url = config.url;
    var collectionName = config.collectionName;
	var Promise = require('es6-promise'); // not required on windows OS');
	var dataService = {
		connect: function () {
			return new Promise(function (onsuccess, onerror) {				
				MongoClient.connect(url, function (error, db) {					
					if (error) {
						return onerror(error);
					}
					return onsuccess(db);
				});
			});
		},
		migrateData: function (db) {
			return new Promise(function (onsuccess, onerror) {
				//reading data off the json file
				var topics = require('./topics.json');
				//making a mongodb id (_id) matach our id property
				for (var i = 0; i < topics.length; i++) {
					topics[i]._id = topics[i].id;
				}
				//getting a colletion
				var collection = db.collection(collectionName);
				//inserting all documents to the collection
				collection.insertMany(topics, function (error, result) {
					db.close();
					if (error) {
						return onerror(error);
					}
					return onsuccess(result);
				});
			});
		},
		deleteAllDocuments: function (db) {
			return new Promise(function (onsuccess, onerror) {
				var collection = db.collection(collectionName);
				collection.deleteMany({}, function (error, result) {
					db.close();
					if (error) {
						return onerror(error);
					}
					return onsuccess(result);
				});
			});
		},
		getAllTopics: function (db) {
			return new Promise(function (onsuccess, onerror) {
				var collection = db.collection(collectionName);
				//get all topics
				collection.find({}).toArray(function (error, topics) {
					db.close();
					if (error) {
						return onerror(error);
					}
					return onsuccess(topics);
				});
			});
		},
		getTopic: function (params) {
			var db = params.db;
			var query = params.query;
			return new Promise(function (onsuccess, onerror) {
				var collection = db.collection(collectionName);
				var mainQuery = query[0];
				var subQuery = query[1] || {};
				collection.findOne(mainQuery, subQuery, function (error, topic) {
					db.close();
					if (error) {
						return onerror(error);
					}
					return onsuccess(topic);
				});
			});
		},
		getNextIndex: function (db) {
			//import the mongodb-autoincrement package
			var autoIncrement = require("mongodb-autoincrement");
			return new Promise(function (onsuccess, onerror) {
				//collectionName
				autoIncrement.getNextSequence(db, collectionName, function (error, autoIndex) {
					if (error) {
						db.close();
						return onerror(error);
					}
					return onsuccess({
						db: db,
						index: autoIndex
					});
				});
			});
		},
		insertTopic: function (params) {
			var topic = params.topic;
			var db = params.db;
			var index = params.index;
			topic.id = topic._id = index;
			return new Promise(function (onsuccess, onerror) {
				var collection = db.collection(collectionName);
				//insert the document
				collection.insert(topic, function (error, result) {
					db.close();
					if (error) {
						return onerror(error);
					}
					return onsuccess(result);
				});
			});
		}
	}
	return dataService;
};
