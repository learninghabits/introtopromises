var express = require('express');
var app = express();

var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/topics';

var bodyparser = require('body-parser');
app.use(bodyparser.json());

app.get('/', function (request, response) {
    response.status(200).send('API is ready to receive requests');
});

app.get('/api/migrate', function (request, response) {
    //opening database connection
    MongoClient.connect(url, function (error, db) {
        if (error) {
            console.log(error);
            db.close();
            response.status(500).send(error.message);
            return;
        }
        var migrateData = function (db, callback) {
            //reading data off the json file
            var topics = require('./topics.json');
            //making a mongodb id (_id) matach our id property
            for (var i = 0; i < topics.length; i++) {
                topics[i]._id = topics[i].id;
            }
            //getting a colletion
            var collection = db.collection('topicsCollection');
            //inserting all documents to the collection
            collection.insertMany(topics, function (error, result) {
                db.close();
                if (error) {
                    console.log(error);
                    response.status(500).send(error.message);
                    return;
                }
                callback(result);
            });
        };
        var onMigrateCompleted = function (result) {
            response.status(200).send('Number of records inserted is : '
				+ result.insertedCount);
        };

        migrateData(db, onMigrateCompleted);
    });
});

app.get('/api/clean', function (request, response) {
    MongoClient.connect(url, function (error, db) {
        if (error) {
            console.log(error);
            db.close();
            response.status(500).send('Internal server : could not connect to database');
            return;
        }
        var deleteAllData = function (db, callback) {
            var collection = db.collection('topicsCollection');
            collection.deleteMany({}, function (error, result) {
                db.close();
                if (error) {
                    console.log(error);
                    response.status(500).send('Internal server : failed to delete data');
                    return;
                }
                callback(result);
            });
        };
        var onDeleteAllDataCompleted = function (result) {
            response.status(200).send('Number of records deleted is : ' + result.deletedCount);
        };

        deleteAllData(db, onDeleteAllDataCompleted);
    });
});

app.get('/api/topics', function (request, response) {
    MongoClient.connect(url, function (error, db) {
        if (error) {
            console.log(error);
            db.close();
            response.status(500).send(error.message);
            return;
        }
        var getAllTopics = function (db, callback) {
            var collection = db.collection('topicsCollection');
            //get all topics
            collection.find({}).toArray(function (error, topics) {
                db.close();
                if (error) {
                    console.log(error);
                    response.status(500).send(error.message);
                    return;
                }
                callback(topics);
            });
        };
        var onGetAllTopicsCompleted = function (topics) {
            response.status(200)
				.send(topics.map(function (topic) {
				    return {
				        id: topic.id,
				        topic: topic.topic,
				        url: request.protocol + '://' + request.get('host') + '/api/topic/' + topic.id
				    }
				}));
        };
        getAllTopics(db, onGetAllTopicsCompleted);
    });
});

app.get('/api/topic/:id', function (request, response) {
    var id = parseInt(request.params.id);
    if (!Number.isInteger(id)) {
        response.status(500)
			.send('Bad data received: expected a topic id but was not found');
        return;
    }

    MongoClient.connect(url, function (error, db) {
        if (error) {
            console.log(error);
            db.close();
            response.status(500).send(error.message);
            return;
        }
        var getTopic = function (db, callback) {
            var collection = db.collection('topicsCollection');
            //get a topic passing the id parameter 
            //note an alternative syntaxt using query operators
            //collection.findOne({_id : { $eq : id }}
            collection.findOne({ _id: id }, function (error, topic) {
                db.close();
                if (error) {
                    console.log(error);
                    response.status(500).send(error.message);
                    return;
                }
                callback(topic);
            });
        };
        var onGetTopicCompleted = function (topic) {
            response.status(200)
				.send(topic);
        };
        getTopic(db, onGetTopicCompleted);
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
    MongoClient.connect(url, function (error, db) {
        if (error) {
            console.log(error);
            db.close();
            response.status(500).send(error.message);
            return;
        }
        var getTopic = function (db, callback) {
            var collection = db.collection('topicsCollection');
            //get a topic passing the id parameter and a name parameter
            collection.findOne({ _id: id }, { tutorials: { $elemMatch: { name: name } } }, function (error, topic) {
                db.close();
                if (error) {
                    console.log(error);
                    response.status(500).send(error.message);
                    return;
                }
                callback(topic);
            });
        };
        var onGetTopicCompleted = function (topic) {
            response.status(200)
				.send(topic);
        };
        getTopic(db, onGetTopicCompleted);
    });
});

app.post('/api/topic', function (request, response) {
    //import the mongodb-autoincrement package
    var autoIncrement = require("mongodb-autoincrement");
    var topic = request.body;
    MongoClient.connect(url, function (error, db) {
        if (error) {
            console.log(error);
            db.close();
            response.status(500).send(error.message);
            return;
        }
        var InsertDocument = function (db, callback) {
            var collectionName = 'topicsCollection';
            var collection = db.collection(collectionName);
            //call the autoIncrement to get the next index
            autoIncrement.getNextSequence(db, collectionName, function (err, autoIndex) {
                if (err) {
                    console.log(err);
                    db.close();
                    response.status(500).send(err.message);
                    return;
                }
                //use the autoIndex as the ID
                topic.id = topic._id = autoIndex;
                //insert the document
                collection.insert(topic, function (error, result) {
                    db.close();
                    if (error) {
                        console.log(error);
                        response.status(500).send(error.message);
                        return;
                    }
                    callback(result);
                });
            });
        };
        var onInsertDocumentCompleted = function (result) {
            response.status(200).send({
                id: topic.id,
                url: request.protocol + '://' + request.get('host') + '/api/topic/' + topic.id
            });

        };
        InsertDocument(db, onInsertDocumentCompleted);
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