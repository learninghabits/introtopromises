var express = require('express');
var app = express();
var bodyparser = require('body-parser');
app.use(bodyparser.json());
var dataService = require('./dataservice')();

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