/*jslint unparam: true, indent: 4, node: true */

var net = require('net'),
    jsdom = require('jsdom'),
    jquery = require('jquery'),
    http = require('http'),
    url = require('url'),
    Memcached = require('memcached'),
    hashlib = require('hashlib'),
    uuid = require('node-uuid'),
    twikifier = require('./twikifier'),
    twik = require('./twik');

var Emitter = require('events').EventEmitter,
    server = net.createServer(),
    wikifiers = {},
    getData;

var window = jsdom.jsdom('<html><head></head><body></body></html>')
        .createWindow();
var jQuery = jquery.create(window); // jQuery-ize the window

var formatText = function(place, wikify, text, tiddler) {
    wikify(text, place, null, tiddler);
    return place.innerHTML;
};

var processData = function(store, tiddlerTitle, wikify) {
    var tiddler = store.fetchTiddler(tiddlerTitle);
    var place = jQuery("<div id='" + tiddlerTitle + "'>");
    place.appendTo('body');
    var output = formatText(place[0], wikify, tiddler.text, tiddler);
    place.remove();
    return output;
};

var processRequest = function(args) {
    var collection_uri = args[0],
        tiddlerTitle = args[1],
        tiddlyweb_cookie = args[2] || '';

    var memcache = new Memcached('127.0.0.1:11211'),
        emitter = new Emitter(),
        namespace = hashlib.sha1('any_namespace'),
        globals = twikifier.createWikifier(window, jQuery,
                {container: collection_uri});

    var wikify = globals[0],
        store = globals[1],
        Tiddler = globals[2];

    if (!memcache) {
        getData(memcache, collection_uri, tiddlyweb_cookie, emitter, store,
                Tiddler, tiddlerTitle, wikify, false);
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
                            return processRequest(args);
                        } else {
                            getData(memcache, collection_uri,
                                tiddlyweb_cookie, emitter, store,
                                Tiddler, tiddlerTitle, wikify, false);
                        }
                    });
                } else {
                    var memcacheKey = hashlib.sha1(result + collection_uri);
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
                                    tiddlerTitle, wikify, memcacheKey);
                            } else {
                                console.log('using cache for', collection_uri);
                                twik.loadRemoteTiddlers(store, Tiddler,
                                    collection_uri, data);
                                var output = processData(store, tiddlerTitle,
                                    wikify);
                                emitter.emit('output', output);
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
        emitter, store, Tiddler, tiddlerTitle, wikify, memcacheKey) {
    console.log('not using cache for', collection_uri);
    var parsed_uri = url.parse(collection_uri);

    var client = http.createClient(parsed_uri.port ? parsed_uri.port : 80,
            parsed_uri.hostname);
    var request = client.request('GET', parsed_uri.pathname + '?fat=1',
            {
                'host': parsed_uri.hostname,
                'accept': 'application/json',
                'cookie': tiddlyweb_cookie
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
                var output = processData(store, tiddlerTitle, wikify);
                emitter.emit('output', output);
            });
        }
    });
};

server.addListener('connection', function(c) {
    c.addListener('data', function(data) {
        var dataString = data.toString().replace(/(\r|\n)+$/, '');
        var args = dataString.split(/\x00/);
        console.log(args);
        var output = processRequest(args);
        if (typeof output === "string") {
            c.end(output);
        } else {
            output.on('output', function(data) {
                c.end(data);
            });
        }
    });
});

server.listen('/tmp/wst.sock');
