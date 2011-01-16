// create the formatter global that is needed. Must be here
// at the end because we need to have config established.
// XXX Why is formatter a global!!!!
var formatter = new Formatter(config.formatters);

// messages required for invokeMacro
merge(config.messages,{
    macroError: "Error in macro <<\%0>>",
    macroErrorDetails: "Error while executing macro <<\%0>>:\n%1",
    missingMacro: "No such macro"});

return [wikify, store, Tiddler];
}

// require the jsdom and jquery libraries, via NODE_PATH
// (probably /usr/local/lib/node if you are using npm)
var jsdom = require('jsdom');
var jquery = require('jquery');
var fs = require('fs');
var http = require('http')
var url = require('url');
var window = jsdom.jsdom(
        '<html><head></head><body><div id="tiddler"></div></body></html>'
    ).createWindow(); 

// jquery-ize the window
var jQuery = jquery.create(window);


var formatText = function(wikify, text) {
    // create a browser window
    var place = window.document.getElementById('tiddler');;

    // wikify the tiddler text.
    // XXX This should be functional, returning a string,
    // not building up the dom in place.
    wikify(text, place, null, null);

    return window.document.innerHTML;
}

var run = function(wikify, file) {
    var text = '';

    file.on('data', function(chunk) {
        text += chunk;
    });

    file.on('end', function() {
        console.log(formatText(wikify, text));
    });
};

// read a file to get text
var runFile = function(wikify, filename) {
    var text = '';
    stream = fs.createReadStream(filename, { 'encoding': 'utf8' });
    run(wikify, stream);
}

// read stdin to get text
var runStdin = function(wikify) {
    var stdin = process.openStdin();
    stdin.setEncoding('utf8');
    run(wikify, stdin);
}

var loadRemoteTiddlers = function(store, Tiddler, jsonTiddlers) {
    var tiddlers = JSON.parse(jsonTiddlers);
    for (var i = 0; i < tiddlers.length ; i++) {
        var t = new Tiddler(tiddlers[i].title);
        t.text = tiddlers[i].text;
        t.tags = tiddlers[i].tags;
        t.modifier = tiddlers[i].modifier;
        t.modified = Date.convertFromYYYYMMDDHHMM(tiddlers[i].modified)
        t.created = Date.convertFromYYYYMMDDHHMM(tiddlers[i].created)
        t.fields = tiddlers[i].fields;
        store.addTiddler(t);
    }
}

var main = function() {
    var arglength = process.argv.length;
    var uri = process.argv[2];
    var parsed_uri = url.parse(uri);
    
    // Create formatter for _that_ window.
    var globals = createWikifier(window, jQuery);
    var wikify = globals[0];
    var store = globals[1];
    var Tiddler = globals[2];

    var client = http.createClient(parsed_uri.port ? parsed_uri.port : 80,
            parsed_uri.hostname);
    var request = client.request('GET', parsed_uri.pathname + '?fat=1', 
            {'host': parsed_uri.hostname,
             'accept': 'application/json'});
    request.end();
    request.on('response', function(response) {
        response.setEncoding('utf8');
        var data = ''
        response.on('data', function(chunk) {
            data += chunk;
        });
        response.on('end', function() {
            loadRemoteTiddlers(store, Tiddler, data);
            if (arglength > 3) {
                for (var i = 3; i < arglength ; i++) {
                    runFile(wikify, process.argv[i]);
                }
            } else {
                runStdin(wikify);
            }
        });
    });
}

exports.formatText = formatText;

if (module.parent === undefined)
    main();
