var net = require('net');
var jsdom = require('jsdom');
var jquery = require('jquery');
var http = require('http');
var url = require('url');
var memcached = require('memcached');
var hashlib = require('hashlib');
var uuid = require('node-uuid');
var twikifier = require('./twikifier');
var twik = require('./twik');

var Emitter = require('events').EventEmitter;
var server = net.createServer();
var wikifiers = {};

var window = jsdom.jsdom(
        '<html><head></head><body></body></html>').createWindow(); 

var jQuery = jquery.create(window); // jquery-ize the window

var formatText = function(place, wikify, text, tiddler) {
    wikify(text, place, null, tiddler);
    return place.innerHTML;
}

var processData = function(store, tiddlerTitle, wikify) {
    tiddler = store.fetchTiddler(tiddlerTitle);
    place = jQuery("<div id='" + tiddlerTitle + "'>");
    place.appendTo('body');
    var output = formatText(place[0], wikify, tiddler.text, tiddler);
    place.remove();
    return output;
}

var processRequest = function(args) {
    var collection_uri = args[0];
    var tiddlerTitle = args[1];
    var tiddlyweb_cookie = '';
    if (args.length > 2) {
        tiddlyweb_cookie = args[2];
    }

    var memcache = new memcached('127.0.0.1:11211');
    var emitter = new Emitter();
    var namespace = hashlib.sha1('any_namespace');
    var globals, wikify, store, Tiddler;
    globals = twikifier.createWikifier(window, jQuery);
    wikify = globals[0];
    store = globals[1];
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
                        if (err) console.error(err);
                        if (result) {
                            return processRequest(args);
                        } else {
                            getData(memcache, collection_uri,
                                tiddlyweb_cookie, emitter, store,
                                Tiddler, tiddlerTitle, wikify, false);
                            
                        }
                    });
                } else {
                    memcacheKey = hashlib.sha1(result + collection_uri);
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
}

var getData = function(memcache, collection_uri, tiddlyweb_cookie,
        emitter, store, Tiddler, tiddlerTitle, wikify, memcacheKey) {
    console.log('not using cache for', collection_uri);
    var parsed_uri = url.parse(collection_uri);

    var client = http.createClient(parsed_uri.port ? parsed_uri.port : 80,
            parsed_uri.hostname);
    var request = client.request('GET', parsed_uri.pathname + '?fat=1',
            {'host': parsed_uri.hostname,
            'accept': 'application/json',
            'cookie': tiddlyweb_cookie});
    request.end();
    request.on('error', function(err) {
        emitter.emit('output', 'Error getting collection: ' + err);
    });
    request.on('response', function(response) {
        if (response.statusCode == '302' &&
            response.headers['location'].indexOf('/challenge')) {
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
}

server.addListener('connection', function(c) {
        c.addListener('data', function(data) {
            dataString = data.toString();
            dataString = dataString.replace(/(\r|\n)+$/, '');
            args = dataString.split(/\x00/);
            console.log(args);
            output = processRequest(args);
            if (typeof output=="string") {
                c.end(output);
            } else {
                output.on('output', function(data) {
                    c.end(data);
                });
            }
        });
});

server.listen('/tmp/wst.sock');
