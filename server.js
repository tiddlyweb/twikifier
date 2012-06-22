/*jslint unparam: true, indent: 4, node: true */

process.title = 'twikifier'; // helpful for watching top and ps

var net = require('net'),
    jsdom = require('jsdom'),
    jquery = require('jquery'),
    http = require('http'),
    url = require('url'),
    Memcached = require('memcached'),
    crypto = require('crypto'),
    uuid = require('node-uuid'),
    twikifier = require('./twikifier'),
    twik = require('./twik');

var Emitter = require('events').EventEmitter,
    server = net.createServer({allowHalfOpen: true}),
    memcache = new Memcached('127.0.0.1:11211'),
    wikifiers = {},
    getData;

var window = jsdom.jsdom('<html><head></head><body></body></html>')
        .createWindow();
var jQuery = jquery.create(window); // jQuery-ize the window

var formatText = function(place, wikify, text, tiddler) {
    wikify(text, place, null, tiddler);
    return place.innerHTML;
};

var sha1Hex = function(input) {
    var hashMaker = crypto.createHash('sha1');
    return hashMaker.update(input).digest('hex');
};

var processData = function(store, tiddlerText, wikify) {
    var place = jQuery("<div>"),
        output = formatText(place[0], wikify, tiddlerText);

    place.remove();

    return output;
};

// use a bag's namespace if possible, otherwise use any
var getNamespace = function(uri) {
    var match = /\/(bags|recipes)\/([^\/]+)/.exec(uri),
        namespace;

    if (!match || match[1] === 'recipes') {
        namespace = 'any_namespace';
    } else {
        namespace = match[1] + ':' + match[2] + '_namespace';
    }
    return sha1Hex(namespace);
};

var processRequest = function(args, emitter) {
    emitter = emitter || new Emitter();

    var collection_uri = args[0],
        tiddlerText = args[1],
        tiddlyweb_cookie = args[2] || '',
        globals = twikifier.createWikifier(window, jQuery,
                {container: collection_uri}),
        namespace = getNamespace(collection_uri),
        wikify = globals[0],
        store = globals[1],
        Tiddler = globals[2];

    if (!memcache) {
        getData(memcache, collection_uri, tiddlyweb_cookie, emitter, store,
                Tiddler, tiddlerText, wikify, false);
    } else {
        memcache.get(namespace, function(err, result) {
            if (err) {
                console.error(err);
                emitter.emit('output', 'Error getting namespace key ' + err);
            } else {
                if (!result) {
                    result = uuid();
                    memcache.set(namespace, result, 0, function(err, result) {
                        if (err) {
                            console.error(err);
                        }
                        if (result) {
                            return processRequest(args, emitter);
                        } else {
                            getData(memcache, collection_uri,
                                tiddlyweb_cookie, emitter, store,
                                Tiddler, tiddlerText, wikify, false);
                        }
                    });
                } else {
                    var memcacheKey = sha1Hex(result + collection_uri);
                    memcache.get(memcacheKey, function(err, result) {
                        if (err) {
                            console.error(err);
                            emitter.emit('output',
                                'Error getting collection key ' + err);
                        } else {
                            var data = result;
                            if (!data) {
                                getData(memcache, collection_uri,
                                    tiddlyweb_cookie, emitter, store, Tiddler,
                                    tiddlerText, wikify, memcacheKey);
                            } else {
                                console.log('using cache for', collection_uri);
                                twik.loadRemoteTiddlers(store, Tiddler,
                                    collection_uri, data);
                                emitter.emit('output',
                                    processData(store, tiddlerText, wikify));
                            }
                        }
                    });
                }
            }
        });
    }
    return emitter;
};

getData = function(memcache, collection_uri, tiddlyweb_cookie,
        emitter, store, Tiddler, tiddlerText, wikify, memcacheKey) {
    if (/<</.test(tiddlerText)) {
        console.log('not using cache for', collection_uri);
        var parsed_uri = url.parse(collection_uri),
            client = http.createClient(parsed_uri.port ? parsed_uri.port : 80,
                parsed_uri.hostname),
            request = client.request('GET', parsed_uri.pathname,
                {
                    'host': parsed_uri.hostname,
                    'accept': 'application/json',
                    'cookie': tiddlyweb_cookie,
                    'user-agent': 'twikifier server.js',
                    'x-controlview': 'false'
                });

        request.end();

        request.on('error', function(err) {
            emitter.emit('output', 'Error getting collection: ' + err);
        });

        request.on('response', function(response) {
            if (response.statusCode === '302' &&
                    response.headers.location.indexOf('/challenge')) {
                emitter.emit('output', 'Error getting collection: challenger.');
            } else {
                response.setEncoding('utf8');
                var content = '';
                response.on('data', function(chunk) {
                    content += chunk;
                });
                response.on('end', function() {
                    if (typeof memcache !== 'undefined' && memcacheKey) {
                        memcache.set(memcacheKey, content, 0, function() {});
                    }
                    twik.loadRemoteTiddlers(store, Tiddler, collection_uri, content);
                    var output = processData(store, tiddlerText, wikify);
                    emitter.emit('output', output);
                });
            }
        });
    } else {
        var output = processData(store, tiddlerText, wikify);
        emitter.emit('output', output);
    }
};

server.addListener('connection', function(c) {
    var data = '';
    c.addListener('error', function(err) {
        c.destroy();
        console.error(err);
    });
    c.addListener('data', function(chunk) {
        data += chunk;
    });
    c.addListener('end', function() {
        var dataString = data.toString().replace(/(\r|\n)+$/, '');
        var args = dataString.split(/\x00/);
        var output = processRequest(args);
        if (typeof output === "string") {
            c.end(output);
            c.destroy();
        } else {
            output.on('output', function(data) {
                c.end(data);
                c.destroy();
            });
        }
    });
});

server.listen('/tmp/wst.sock');
server.maxConnections = 20;
