var express = require('express');
var app = express();
var bodyparser = require('body-parser');
app.use(bodyparser.json());

var DataService = function (collectionName) {
	var MongoClient = require('mongodb').MongoClient;
	var url = 'mongodb://localhost:27017/topics';
	var dataService = {
		connect: function () {
			return new Promise(function (onsuccess, onerror) {
				MongoClient.connect(url, function (error, db) {
					if (error) {
						return onerror(error);
					}
					return onsuccess(db);
				});
			})
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
						return onsuccess(error);
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
						return onsuccess(error);
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

var dataService = new DataService('topicsCollection');

app.get('/', function (request, response) {
	response.status(200).send('API is ready to receive requests');
});

app.get('/api/migrate', function (request, response) {
	dataService
		.connect()
		.then(dataService.migrateData)
		.then(function (result) {
			response.status(200).send('Number of records inserted is : '
				+ result.insertedCount);
		})
		.catch(function (error) {
			response.status(500).send(error.message);
		});
});

app.get('/api/clean', function (request, response) {
	dataService
		.connect()
		.then(dataService.deleteAllDocuments)
		.then(function (result) {
			response.status(200).send('Number of records deleted is : '
				+ result.deletedCount);
		})
		.catch(function (error) {
			response.status(500).send(error.message);
		});
});

app.get('/api/topics', function (request, response) {
	dataService
		.connect()
		.then(dataService.getAllTopics)
		.then(function (topics) {
			response.status(200)
				.send(topics.map(function (topic) {
					return {
						id: topic.id,
						topic: topic.topic,
						url: request.protocol + '://' + request.get('host') + '/api/topic/' + topic.id
					}
				}));
		})
		.catch(function (error) {
			response.status(500).send(error.message);
		});
});

app.get('/api/topic/:id', function (request, response) {
	var id = parseInt(request.params.id);
	if (!Number.isInteger(id)) {
		response.status(500)
			.send('Bad data received: expected a topic id but was not found');
		return;
	}

	dataService
		.connect()
		.then(function (db) {
			var query = [{ _id: id }];
			return dataService.getTopic({ db: db, query: query });
		})
		.then(function (topic) {
			response.status(200)
				.send(topic);
		})
		.catch(function (error) {
			response.status(500).send(error.message);
		});
});

app.get('/api/topic/:id/:name', function (request, response) {
	var id = parseInt(request.params.id);
	if (!Number.isInteger(id)) {
		response.status(500)
			.send('Bad data received: expected a topic id but was not found');
		return;
	}
	var name = request.params.name;
	dataService
		.connect()
		.then(function (db) {
			var query = [{ _id: id }, { tutorials: { $elemMatch: { name: name } } }];
			return dataService.getTopic({ db: db, query: query });
		})
		.then(function (topic) {
			response.status(200)
				.send(topic);
		})
		.catch(function (error) {
			response.status(500).send(error.message);
		});
});

app.post('/api/topic', function (request, response) {
	var topic = request.body;
	dataService
		.connect()
		.then(dataService.getNextIndex)
		.then(function (data) {
			 data.topic = topic;
			return dataService.insertTopic(data);
		})
		.then(function (result) {
			response.status(200).send({
				id: topic.id,
				url: request.protocol + '://' + request.get('host') + '/api/topic/' + topic.id
			});
		})
		.catch(function (error) {
			response.status(500).send(error.message);
		});
});

app.get('*', function (request, response) {
	response.status(400)
		.send('No suitable handler found for the request');
});

app.post('*', function (request, response) {
	response.status(400)
		.send('No suitable handler found for the request');
});

app.delete('*', function (request, response) {
	response.status(400)
		.send('No suitable handler found for the request');
});

//var port = process.argv.slice(2)[0] || (process.env.PORT || 80);
var port = 8181;
app.listen(port, function () {
	console.log("SERVER IS LISTENING ON PORT: " + port);
});