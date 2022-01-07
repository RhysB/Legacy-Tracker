var util = require('./util');
var config = require('../config.json');

exports.setup = function () {
    var sqlite = require('sqlite3');
    var HashMap = require('hashmap');
    var logger = require('../lib/logger');

    var hashMap = new HashMap();

    var memoryHashMap = new HashMap();

    var avgServerName = [];
    var avgServerAverage = [];
    var avgServerLastUpdate = [];

    var db = new sqlite.Database('database.sql');

    db.serialize(function () {
        db.run('CREATE TABLE IF NOT EXISTS pings (timestamp BIGINT NOT NULL, ip TINYTEXT, playerCount MEDIUMINT)');
        db.run('CREATE INDEX IF NOT EXISTS ip_index ON pings (ip, playerCount)');
        db.run('CREATE INDEX IF NOT EXISTS timestamp_index on PINGS (timestamp)');
    });

    exports.log = function (ip, timestamp, playerCount) {
        var insertStatement = db.prepare('INSERT INTO pings (timestamp, ip, playerCount) VALUES (?, ?, ?)');
        if (hashMap.has(ip)) {
            hashMap.get(ip).set("pingCount", hashMap.get(ip).get("pingCount") + 1);
            hashMap.get(ip).set("playerTotal", hashMap.get(ip).get("playerTotal") + playerCount);
        }


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

    function getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

    var getJSON = require('get-json');

    exports.getAverage = function (ip, type, callback) {
        if (type == "LEGACYMCAPI") {
            getJSON("https://servers.api.legacyminecraft.com/api/v1/getServer?uuid=" + ip + "&icons=true", function (error, res) {
                if (error) {
                    callback(error, null);
                    return;
                } else {
                    if (res.found) {
                        callback(res.average.month);
                        return
                    }
                }
                callback(error, null);
            })
        } else if(config.logToDatabase) {
            let currentUnix = Math.floor(Date.now() / 1000);
            let currentTime = util.getCurrentTimeMs();
            if (!hashMap.has(ip)) {
                var tempHashMap = new HashMap();
                db.all("SELECT COUNT(playerCount) FROM pings WHERE ip = ? AND timestamp >= ?", [ip, currentTime - config.AverageDuration], function (err, data) {
                    var pingCounts = data[0]['COUNT(playerCount)'];
                    logger.log('info', 'Quarried database for ping count of %s: %s', ip, pingCounts);
                    tempHashMap.set("pingCount", pingCounts);
                    db.all("SELECT SUM(playerCount) FROM pings WHERE ip = ? AND timestamp >= ?", [ip, currentTime - config.AverageDuration], function (err, data) {
                        var totalPlayerCount = data[0]['SUM(playerCount)'];
                        logger.log('info', 'Quarried database for player total of %s: %s', ip, totalPlayerCount);
                        tempHashMap.set("playerTotal", totalPlayerCount);
                        hashMap.set(ip, tempHashMap);
                        callback(0);
                    });
                });
            } else {
                let average = hashMap.get(ip).get("playerTotal") / hashMap.get(ip).get("pingCount");
                callback(average);
                return;
            }
        }
        // callback(null);

    };


    exports.getAverage1 = function (ip, callback) {
        let currentUnix = Math.floor(Date.now() / 1000);
        var limit = currentUnix - 60 * 60 * 48;
        if (!hashMap.has(ip)) {
            var tempHashMap = new HashMap();
            tempHashMap.set("average", 0);
            var randomFirst = getRandomArbitrary(60, 60 * 60 * 6);
            tempHashMap.set("unix", limit + randomFirst);

            hashMap.set(ip, tempHashMap);
        }
        if (hashMap.get(ip).get("unix") > limit) {
            callback(hashMap.get(ip).get("average"))
        } else {
            //Fetch new Average
            var currentTime = util.getCurrentTimeMs();
            callback(hashMap.get(ip).get("average"))
            logger.log('info', 'Starting query for player average of %s', ip);
            hashMap.get(ip).set("unix", currentUnix);
            db.all("SELECT AVG(playerCount) FROM pings WHERE ip = ? AND timestamp >= ?", [ip, currentTime - config.AverageDuration], function (err, data) {
                var average = data[0]['AVG(playerCount)'];
                logger.log('info', 'Quarried database for player average of %s: %s', ip, average);
                hashMap.get(ip).set("average", average);
            });
        }

    };

    exports.getAverageSQL = function (ip, callback) {
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
