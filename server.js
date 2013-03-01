/*jslint unparam: true, indent: 4, node: true */

"use strict";

process.title = 'twikifier'; // helpful for watching top and ps

var net = require('net'),
	fs = require('fs'),
	jsdom = require('jsdom'),
	jquery = require('jQuery'),
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
	socketPath = '/tmp/wst.sock',
	getData,
	getContainerInfo;

var formatText = function(place, wikify, text, tiddler) {
	wikify(text, place, null, tiddler);
	return place.innerHTML;
};

var sha1Hex = function(input) {
	var hashMaker = crypto.createHash('sha1');
	return hashMaker.update(input).digest('hex');
};

var processData = function(store, tiddlerText, wikify, jQuery) {
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


var processRequest = function(args, id, emitter) {
	emitter = emitter || new Emitter();
	console.log('starting request', id);
	return {emitter: emitter, action: function () {

		var window = jsdom.jsdom('<html><head></head><body></body></html>')
				.createWindow(),
			jQuery = jquery.create(window), // jQuery-ize the window
			collection_uri = args[0],
			tiddlerText = args[1],
			tiddlyweb_cookie = args[2] || '',
			globals = twikifier.createWikifier(window, jQuery,
					{container: collection_uri}),
			wikify = globals[0],
			store = globals[1],
			Tiddler = globals[2];

		getData(collection_uri, tiddlyweb_cookie, emitter, store,
				Tiddler, tiddlerText, wikify, jQuery, id);
	}};
};

getData = function(collection_uri, tiddlyweb_cookie,
		emitter, store, Tiddler, tiddlerText, wikify, jQuery, id) {
	if (/<</.test(tiddlerText)) { // augment the store with other tiddlers
		if (!memcache) {
			console.log('getting macro tiddlers via', collection_uri, id);
			getContainerInfo(emitter, collection_uri, tiddlyweb_cookie, store,
					tiddlerText, wikify, jQuery, Tiddler, false, id);
		} else {
			var namespace = getNamespace(collection_uri);
			memcache.get(namespace, function(err, result) {
				if (err) {
					console.error('namespace get', err, id);
					emitter.emit('output', 'Error getting namespace key ' + err);
				} else {
					if (!result) {
						result = uuid();
						memcache.set(namespace, result, 0, function(err, result) {
							if (err) {
								console.error('error setting namespace', err, id);
							} else {
								console.log('no key for namespace', id);
								if (result) {
									// use the original emitter
									console.log('re-requesting for', collection_uri, id);
									getData(collection_uri, tiddlyweb_cookie,
										emitter, store, Tiddler, tiddlerText,
										wikify, jQuery, id);
								} else {
									console.log('non-error namespace getting error', id);
									emitter.emit('output',
										'no key for namespace');
								}
							}
						});
					} else {
						var memcacheKey = sha1Hex(result + collection_uri);
						memcache.get(memcacheKey, function(err, result) {
							if (err) {
								console.error('error getting data', err, id);
								emitter.emit('output',
									'Error getting collection key ' + err);
							} else {
								if (!result) {
									console.log('not using cache for',
										collection_uri, id);
									getContainerInfo(emitter, collection_uri,
										tiddlyweb_cookie, store, tiddlerText,
										wikify, jQuery, Tiddler, memcache,
										memcacheKey, id);
								} else {
									console.log('using cache for', collection_uri, id);
									twik.loadRemoteTiddlers(store, Tiddler,
										collection_uri, result);
									var output = processData(store, tiddlerText,
										wikify, jQuery);
									console.log('emitting for', collection_uri, id);
									emitter.emit('output', output);
								}
							}
						});
					}
				}
			});
		}
	} else { // no special macros, just wikify
		console.log('emitting no macros', collection_uri, id);
		emitter.emit('output', processData(store, tiddlerText, wikify, jQuery));
	}
};

getContainerInfo = function(emitter, collection_uri, tiddlyweb_cookie,
		store, tiddlerText, wikify, jQuery, Tiddler, memcache, memcacheKey,
		id) {
	var parsed_uri = url.parse(collection_uri),
		request_options = {
			hostname: parsed_uri.hostname,
			port: parsed_uri.port || 80,
			method: 'GET',
			path: parsed_uri.pathname,
			headers: {
				'host': parsed_uri.hostname,
				'accept': 'application/json',
				'cookie': tiddlyweb_cookie,
				'user-agent': 'twikifier server.js',
				'x-controlview': 'false'
			}
		},
		request = http.request(request_options, function(response) {
			if (response.statusCode === '302' &&
					response.headers.location.indexOf('/challenge')) {
				console.log('emitting after challenge', id);
				emitter.emit('output', processData(store,
						tiddlerText, wikify, jQuery));
			} else {
				response.setEncoding('utf8');
				var content = '';
				response.on('data', function(chunk) {
					content += chunk;
				});
				response.on('end', function() {
					if (memcache && memcacheKey) {
						console.log('setting cache for', collection_uri, id);
						memcache.set(memcacheKey, content, 0, function() {});
					}
					twik.loadRemoteTiddlers(store, Tiddler,
						collection_uri, content);
					var output = processData(store, tiddlerText,
						wikify, jQuery);
					console.log('emitting after http load', id);
					emitter.emit('output', output);
				});
			}
		});

	request.on('error', function(err) {
		emitter.emit('output', processData(store, tiddlerText,
				wikify, jQuery));
	});

	request.end();
};

server.addListener('connection', function(c) {
	var data = '',
		id = uuid();
	c.addListener('timeout', function() {
		c.end('timeout on socket communication');
		c.destroy();
		console.error('timeout event on connection', c, id);
	});
	c.addListener('error', function(err) {
		c.end('error event on connection');
		c.destroy();
		console.error('error event on connection', c, err, id);
	});
	c.addListener('data', function(chunk) {
		data += chunk;
	});
	c.addListener('end', function() {
		var dataString = data.toString().replace(/(\r|\n)+$/, ''),
			args = dataString.split(/\x00/),
			output = processRequest(args, id);
		output.emitter.on('output', function(data) {
			c.end(data);
			c.destroy();
		});
		output.action();
	});
	// timeout after 10 seconds of inactivity
	c.setTimeout(10000);
});

// unlink the socket before starting
fs.unlink(socketPath, function() {
	server.maxConnections = 50;
	server.listen(socketPath);
});
