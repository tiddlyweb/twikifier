// create the formatter global that is needed. Must be here
// at the end because we need to have config established.
// XXX Why is formatter a global!!!!
var formatter = new Formatter(config.formatters);

return wikify;
}

// require the jsdom and jquery libraries, via NODE_PATH
// (probably /usr/local/lib/node if you are using npm)
var jsdom = require('jsdom');
var jquery = require('jquery');
var fs = require('fs');

var formatText = function(text) {
    // create a browser window
    var window = jsdom.jsdom(
            '<html><head></head><body><div id="tiddler"></div></body></html>'
        ).createWindow(); 

    // jquery-ize the window
    var jQuery = jquery.create(window);

    // Create formatter for _that_ window.
    var wikify = createWikifier(window, jQuery);

    var place = window.document.getElementById('tiddler');;

    // wikify the tiddler text.
    // XXX This should be functional, returning a string,
    // not building up the dom in place.
    wikify(text, place, null, null);

    return window.document.innerHTML;
}

var run = function(file) {
    var text = '';

    file.on('data', function(chunk) {
        text += chunk;
    });

    file.on('end', function() {
        console.log(formatText(text));
    });
};

// read a file to get text
var runFile = function(filename) {
    var text = '';
    stream = fs.createReadStream(filename, { 'encoding': 'utf8' });
    run(stream);
}

// read stdin to get text
var runStdin = function() {
    var stdin = process.openStdin();
    stdin.setEncoding('utf8');
    run(stdin);
}

var main = function() {
    var arglength = process.argv.length;
    if (arglength > 2) {
        for (var i = 2; i < arglength ; i++) {
            runFile(process.argv[i]);
        }
    } else {
        runStdin();
    }
}

main();
