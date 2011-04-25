
var net = require('net');
var jsdom = require('jsdom');
var jquery = require('jquery');
var http = require('http');
var url = require('url');
var twikifier = require('twikifier');
var twik = require('twik');

var Emitter = require('events').EventEmitter;

var server = net.createServer();

var wikifiers = {};

var window = jsdom.jsdom(
        '<html><head></head><body></body></html>').createWindow(); 
// jquery-ize the window
var jQuery = jquery.create(window);

var formatText = function(place, wikify, text) {
    wikify(text, place, null, null);
    return place.innerHTML;
}

var processData = function(store, tiddlerTitle, wikify) {
    tiddler = store.fetchTiddler(tiddlerTitle);
    place = jQuery("<div id='" + tiddlerTitle + "'>");
    place.appendTo('body');
    var output = formatText(place[0], wikify, tiddler.text);
    place.remove();
    console.log(output);
    return output;
}

var processRequest = function(args) {
    var collection_uri = args[0];
    var tiddlerTitle = args[1];

    var useCache = false;
    var globals, wikify, store, Tiddler;
    if (wikifiers[collection_uri] === undefined) {
        globals = twikifier.createWikifier(window, jQuery);
    } else {
        globals = wikifiers[collection_uri];
        useCache = true;
    }
    wikify = globals[0];
    store = globals[1];
    Tiddler = globals[2];

    var emitter = new Emitter();
    if (!useCache) {
        console.log('not using cache for', collection_uri);
        var parsed_uri = url.parse(collection_uri);
        console.log('pu', parsed_uri);


        var client = http.createClient(parsed_uri.port ? parsed_uri.port : 80,
                parsed_uri.hostname);
        var request = client.request('GET', parsed_uri.pathname + '?fat=1',
                {'host': parsed_uri.hostname,
                'accept': 'application/json'});
        request.end();
        request.on('response', function(response) {
                console.log('got response');
                response.setEncoding('utf8');
                var data = '';
                response.on('data', function(chunk) {
                    data += chunk;
                });
                response.on('end', function() {
                    twik.loadRemoteTiddlers(store, Tiddler, collection_uri, data);
                    wikifiers[collection_uri] = globals;
                    var output = processData(store, tiddlerTitle, wikify);
                    emitter.emit('output', output);
                });
        });
        return emitter;
    } else {
        return processData(store, tiddlerTitle, wikify);
    }
}

server.addListener('connection', function(c) {
        c.addListener('data', function(data) {
            dataString = data.toString();
            dataString = dataString.replace(/(\r|\n)+$/, '');
            args = dataString.split(/\s+/);
            console.log(args);
            output = processRequest(args);
            if (typeof output=="string") {
                c.write(output);
            } else {
                output.on('output', function(data) {
                    c.write(data);
                });
            }
        });
});

server.listen('/tmp/wst.sock');

