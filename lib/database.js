var util = require('./util');
var config = require('../config.json');

exports.setup = function () {
	var sqlite = require('sqlite3');

	var db = new sqlite.Database('database.sql');

	db.serialize(function () {
		db.run('CREATE TABLE IF NOT EXISTS pings (timestamp BIGINT NOT NULL, ip TINYTEXT, playerCount MEDIUMINT)');
		db.run('CREATE INDEX IF NOT EXISTS ip_index ON pings (ip, playerCount)');
		db.run('CREATE INDEX IF NOT EXISTS timestamp_index on PINGS (timestamp)');
	});

	exports.log = function (ip, timestamp, playerCount) {
		var insertStatement = db.prepare('INSERT INTO pings (timestamp, ip, playerCount) VALUES (?, ?, ?)');

		db.serialize(function () {
			insertStatement.run(timestamp, ip, playerCount);
		});

		insertStatement.finalize();
	};

	exports.getTotalRecord = function (ip, callback) {
		var currentTime = util.getCurrentTimeMs();
		db.all("SELECT MAX(playerCount) FROM pings WHERE ip = ? AND timestamp >= ?", [ip, currentTime - config.RecordDuration], function (err, data) {
			callback(data[0]['MAX(playerCount)']);
		});
	};


	exports.getAverage = function (ip, callback) {
		var currentTime = util.getCurrentTimeMs();
		db.all("SELECT AVG(playerCount) FROM pings WHERE ip = ? AND timestamp >= ?", [ip, currentTime - config.AverageDuration], function (err, data) {
			//console.log(data)
			callback(data[0]['AVG(playerCount)']);
		});
	};

	exports.queryPings = function (duration, callback) {
		var currentTime = util.getCurrentTimeMs();

		db.all("SELECT * FROM pings WHERE timestamp >= ? AND timestamp <= ?", [
			currentTime - duration,
			currentTime
		], function (err, data) {
			callback(data);
		});
	};
};