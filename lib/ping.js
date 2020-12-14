var mcpe_ping = require('mcpe-ping-fixed');
var mcpc_ping = require('mc-ping-updated');
var getJSON = require('get-json')

var util = require('./util');

// This is a wrapper function for mc-ping-updated, mainly used to convert the data structure of the result.
// function pingMinecraftPC(host, port, timeout, callback, version) {
// 	var startTime = util.getCurrentTimeMs();

// 	mcpc_ping(host, port, function (err, res) {
// 		if (err) {
// 			callback(err, null);
// 		} else {
// 			// Remap our JSON into our custom structure.
// 			callback(null, {
// 				players: {
// 					online: res.players.online,
// 					max: res.players.max
// 				},
// 				version: res.version.protocol,
// 				latency: util.getCurrentTimeMs() - startTime,
// 				favicon: res.favicon
// 			});
// 		}
// 	}, timeout, version);
// }

// This is a wrapper function for mcpe-ping, mainly used to convert the data structure of the result.
function pingMinecraftPE(host, port, timeout, callback) {
    var startTime = util.getCurrentTimeMs();

    mcpe_ping(host, port || 19132, function (err, res) {
        if (err) {
            callback(err, null);
        } else {
            // Remap our JSON into our custom structure.
            console.log(res.version)
            callback(err, {
                players: {
                    online: parseInt(res.currentPlayers),
                    max: parseInt(res.maxPlayers)
                },
                version: res.version,
                latency: util.getCurrentTimeMs() - startTime
            });
        }
    }, timeout);
}

function pingMinecraftPC(host, port, timeout, callback, version) {
    var startTime = util.getCurrentTimeMs();

    mcpc_ping(host, port, function (err, res) {
        if (err) {
            callback(err, null);
        } else {
            // Remap our JSON into our custom structure.
            callback(null, {
                players: {
                    online: res.players.online,
                    max: res.players.max
                },
                version: res.version.protocol,
                latency: util.getCurrentTimeMs() - startTime,
                favicon: res.favicon
            });
        }
    }, timeout, version);
}

// Ping a Json Server for onlineCount
function pingMinecraftJson(host, port, timeout, callback) {
    var startTime = util.getCurrentTimeMs();

    getJSON(host, function (error, res) {
        if (error) {
            callback(error, null);
        } else {
            if(res.isOnline) {
                callback(error, {
                    players: {
                        online: parseInt(res.onlineCount),
                        max: parseInt("100")
                    },
                    version: 0,
                    latency: parseInt(100)
                });
            } else {
                callback("Server Offline", null);
            }

        }
    })
}

//Ping Dynmap
function pingDynmap(host, port, timeout, callback) {
    var startTime = util.getCurrentTimeMs();

    getJSON(host, function (error, res) {
        if (error) {
            callback(error, null);
        } else {
            //Is Dynmap New
            let time = parseInt(res.timestamp) - Date.now();
            time = time / 1000
            time = Math.abs(time)

            if (time < 120) {
                callback(error, {
                    players: {
                        online: parseInt(res.players.length),
                        max: parseInt("100")
                    },
                    version: 0,
                    latency: parseInt(100)
                });
            } else {
                callback("Old Dynmap Cache", null);
            }

        }
    })
}

//LegacyPing 1.0
function pingLegacyPing1(host, port, timeout, callback) {
    var s = require('net').Socket();
    let parts = host.split(":")
    s.connect(parts[1], parts[0]);
    let data = "";
    s.on('data', function (d) {
        data = data + d.toString();
    });


    s.on('end', function () {
        try {
            console.log("Data:" + data)
            let playerCount = 0;
            response = JSON.parse(data)
            for (var playerObject in response["players"]) {
                playerCount = playerCount + 1;
            }
            callback("", {
                players: {
                    online: playerCount,
                    max: parseInt(playerCount + 1)
                },
                version: 0,
                latency: parseInt(100)
            });
        } catch (err) {
            console.log(err)
            callback(err, null);
        }

    });

    s.on('error', function (err) {
        console.log("Error: " + err.message);
        callback(err, null);
    })
    s.end();

}


//MineQuery
function pingMineQuery(host, port, timeout, callback) {
    var s = require('net').Socket();
    let parts = host.split(":")
    s.connect(parts[1], parts[0]);
    s.write('QUERY_JSON\n\r');

    s.on('data', function (d) {
        try {
            response = JSON.parse(d.toString())

            callback("", {
                players: {
                    online: parseInt(response.playerCount),
                    max: parseInt("100")
                },
                version: 0,
                latency: parseInt(100)
            });
        } catch (err) {
            console.log(err)
        }

    });

    s.on('error', function (err) {
        console.log("Error: " + err.message);
    })
    s.end();

}


exports.ping = function (host, port, type, timeout, callback, version) {
    if (type === 'PC') {
        util.unfurlSRV(host, port, function (host, port) {
            pingMinecraftPC(host, port || 25565, timeout, callback, version);
        })
    } else if (type === 'PE') {
        pingMinecraftPE(host, port || 19132, timeout, callback);
    } else if (type === 'JSON') {
        pingMinecraftJson(host, port || 19132, timeout, callback);
    } else if (type === 'DYNMAP') {
        pingDynmap(host, port || 19132, timeout, callback);
    } else if (type === 'MINEQUERY') {
        pingMineQuery(host, port || 19132, timeout, callback);
    } else if (type === "LEGACYPING1") {
        pingLegacyPing1(host, port || 19132, timeout, callback);
    } else {
        throw new Error('Unsupported type: ' + type);
    }
};