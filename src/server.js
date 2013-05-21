#!/usr/bin/env node

/*jslint unparam: true, indent: 4, node: true */

"use strict";

process.title = "twikifier"; // helpful for watching top and ps

var net = require("net"),
    fs = require("fs"),
    jsdom = require("jsdom"),
    jquery = require("jquery"),
    http = require("http"),
    url = require("url"),
    Memcached = require("memcached"),
    crypto = require("crypto"),
    uuid = require("node-uuid"),
    cluster = require("cluster"),
    twikifier = require("../dist/twikifier"),
    twik = require("../dist/twik");

var Emitter = require("events").EventEmitter,
    memcache = new Memcached("127.0.0.1:11211"),
    socketPath = process.argv.length === 3 ? process.argv[2] : "/var/run/twikifier/wst.sock",
    maxWorkers = 4,
    maxClientConnections = 100,
    getData,
    tiddlersFromCache,
    getContainerInfo;

var formatText = function (place, wikify, text, tiddler) {
    wikify(text, place, null, tiddler);
    return place.innerHTML;
};

var sha1Hex = function (input) {
    var hashMaker = crypto.createHash("sha1");
    return hashMaker.update(input).digest("hex");
};

var processData = function (store, tiddlerText, wikify, jQuery) {
    var place = jQuery("<div>"),
        output = formatText(place[0], wikify, tiddlerText);

    place.remove();

    return output;
};

// use a bag's namespace if possible, otherwise use any
var getNamespace = function (uri) {
    var match = /\/(bags|recipes)\/([^\/]+)/.exec(uri),
        namespace;

    if (!match || match[1] === "recipes") {
        namespace = "any_namespace";
    } else {
        namespace = match[1] + ":" + match[2] + "_namespace";
    }
    return sha1Hex(namespace);
};


var processRequest = function (args, id, emitter) {
    emitter = emitter || new Emitter();
    console.log("starting request", id);
    return {
        emitter: emitter,
        action: function () {

            var window = jsdom.jsdom("<html><head></head><body></body></html>",
                null, {
                    features: {
                        FetchExternalResources: false,
                        ProcessExternalResources: false
                    }
                }).createWindow(),
            jQuery = jquery.create(window), // jQuery-ize the window
            collection_uri = args[0],
            tiddlerText = args[1],
            tiddlyweb_cookie = args[2] || "",
            globals = twikifier.createWikifier(window, jQuery, { container: collection_uri }),
            wikify = globals[0],
            store = globals[1],
            Tiddler = globals[2];

            getData(collection_uri, tiddlyweb_cookie, emitter, store, Tiddler, tiddlerText, wikify, jQuery, id);
        }
    };
};

tiddlersFromCache = function (memcacheKey, collection_uri, id, emitter,
                             tiddlyweb_cookie, store, tiddlerText, wikify, jQuery, Tiddler,
                             memcache) {
    memcache.get(memcacheKey, function (err, result) {
        if (err) {
            console.error("error getting data", err, id);
            emitter.emit("output",
                "Error getting collection key " + err);
        } else {
            if (!result) {
                getContainerInfo(emitter, collection_uri, tiddlyweb_cookie,
                    store, tiddlerText, wikify, jQuery, Tiddler, memcache,
                    memcacheKey, id);
            } else {
                console.log("using cache for", collection_uri, id);
                var tiddlerLoader = twik.loadRemoteTiddlers(store, Tiddler,
                        collection_uri, result),
                    tiddlerEmitter = tiddlerLoader.emitter;
                tiddlerEmitter.once("LoadDone", function (tiddlerStore) {
                    emitter.emit("output", processData(tiddlerStore,
                        tiddlerText, wikify, jQuery));
                });
                tiddlerLoader.start();
            }
        }
    });
};

getData = function (collection_uri, tiddlyweb_cookie,
                   emitter, store, Tiddler, tiddlerText, wikify, jQuery, id) {
    if (/<</.test(tiddlerText)) { // augment the store with other tiddlers
        if (!memcache) {
            getContainerInfo(emitter, collection_uri, tiddlyweb_cookie, store,
                tiddlerText, wikify, jQuery, Tiddler, false, id);
        } else {
            var namespace = getNamespace(collection_uri);
            memcache.get(namespace, function (err, result) {
                if (err) {
                    console.error("namespace get", err, id);
                    emitter.emit("output", "Error getting namespace key " + err);
                } else {
                    if (!result) {
                        result = uuid();
                        memcache.set(namespace, result, 0, function (err, result) {
                            if (err) {
                                console.error("error setting namespace", err, id);
                            } else {
                                console.log("no key for namespace", id);
                                if (result) {
                                    // use the original emitter
                                    console.log("re-requesting for", collection_uri, id);
                                    getData(collection_uri, tiddlyweb_cookie,
                                        emitter, store, Tiddler, tiddlerText,
                                        wikify, jQuery, id);
                                } else {
                                    console.error("non-error namespace getting error", id);
                                    emitter.emit("output",
                                        "no key for namespace");
                                }
                            }
                        });
                    } else {
                        var memcacheKey = sha1Hex(result + collection_uri);
                        tiddlersFromCache(memcacheKey, collection_uri, id,
                            emitter, tiddlyweb_cookie, store, tiddlerText,
                            wikify, jQuery, Tiddler, memcache);
                    }
                }
            });
        }
    } else { // no special macros, just wikify
        console.log("emitting no macros", collection_uri, id);
        emitter.emit("output", processData(store, tiddlerText, wikify, jQuery));
    }
};

getContainerInfo = function (emitter, collection_uri, tiddlyweb_cookie,
                            store, tiddlerText, wikify, jQuery, Tiddler, memcache, memcacheKey,
                            id) {
    var parsed_uri = url.parse(collection_uri),
        request_options = {
            hostname: parsed_uri.hostname,
            port: parsed_uri.port || 80,
            method: "GET",
            path: parsed_uri.pathname,
            headers: {
                "host": parsed_uri.hostname,
                "accept": "application/json",
                "cookie": tiddlyweb_cookie,
                "user-agent": "twikifier server.js",
                "x-controlview": "false"
            }
        },
        request = http.request(request_options, function (response) {
            if (response.statusCode === "302" &&
                response.headers.location.indexOf("/challenge")) {
                console.log("emitting after challenge", id);
                emitter.emit("output", processData(store,
                    tiddlerText, wikify, jQuery));
            } else {
                response.setEncoding("utf8");
                var content = "";
                response.on("data", function (chunk) {
                    content += chunk;
                });
                response.once("end", function () {
                    if (memcache && memcacheKey) {
                        console.log("setting cache for", collection_uri, id);
                        memcache.set(memcacheKey, content, 0,
                            function (err) {
                                if (err) {
                                    console.error("error setting cache for",
                                        collection_uri, err);
                                }
                            }
                        );
                    }
                    var tiddlerLoader = twik.loadRemoteTiddlers(store, Tiddler,
                            collection_uri, content),
                        tiddlerEmitter = tiddlerLoader.emitter;
                    tiddlerEmitter.once("LoadDone", function (tiddlerStore) {
                        console.error("emitting after http load", id);
                        emitter.emit("output", processData(tiddlerStore,
                            tiddlerText, wikify, jQuery));
                    });
                    tiddlerLoader.start();
                });
            }
        });

    // If there is a timeout on the HTTP request, just work with
    // the text we've been given, don't let the timeout bubble
    // up to the unix socket communication.
    request.setTimeout(8000, function () {
        console.error("timeout when requesting", collection_uri, id);
        emitter.emit("output", processData(store, tiddlerText, wikify, jQuery));
    });

    request.once("error", function () {
        emitter.emit("output", processData(store, tiddlerText, wikify, jQuery));
    });

    request.end();
};

// startup

function startUp() {
    console.log("starting up");
    if (cluster.isMaster) {
        fs.unlink(socketPath, function () {
            var i;
            console.log("master wants to fork");
            for (i = 0; i < maxWorkers; i++) {
                console.log("forking");
                cluster.fork();
            }
            cluster.on("exit", function (worker) {
                var exitCode = worker.process.exitCode;
                console.log("worker " + worker.process.pid +
                    " died (" + exitCode + "). restarting...");
                cluster.fork();
            });
        });
    } else { // in a child
        console.log("starting worker");

        var server = net.createServer({ allowHalfOpen: true }),
        connectionCount = 0;
        server.maxConnections = 50;
        server.listen(socketPath);

        server.on("connection", function (c) {
            var data = "",
                id = uuid();
            c.once("timeout", function () {
                c.end("timeout on socket communication");
                c.destroy();
                console.error("timeout event on connection", c, id);
                process.exit(1);
            });
            c.once("error", function (err) {
                c.end("error event on connection");
                c.destroy();
                console.error("error event on connection", c, err, id);
                process.exit(1);
            });
            c.on("data", function (chunk) {
                data += chunk;
            });
            c.once("end", function () {
                var dataString = data.toString().replace(/(\r|\n)+$/, ""),
                    args = dataString.split(/\x00/),
                    output = processRequest(args, id);
                output.emitter.once("output", function (data) {
                    console.log("ending request", id);
                    c.end(data);
                    c.destroy();
                });
                output.action();
            });
            // timeout after 10 seconds of inactivity
            c.setTimeout(10000);
            if (connectionCount > maxClientConnections) {
                server.close(process.exit);
            }
        });
    }
}

startUp();
