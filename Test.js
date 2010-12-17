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

// create a browser window
var window = jsdom.jsdom(
        '<html><head></head><body><div id="tiddler"></div></body></html>'
    ).createWindow(); 

// jquery-ize the window
var jQuery = jquery.create(window);

var run = function(window) {
    // read stdin to get text
    var stdin = process.openStdin();
    stdin.setEncoding('utf8');
    var text = '';

    // Create formatter.
    var wikify = createWikifier(window, jQuery);

    var formatText = function(window, text) {
        var place = window.document.getElementById('tiddler');;

        // wikify the tiddler text.
        // XXX This should be functional, returning a string,
        // not building up the dom in place.
        wikify(text, place, null, null);

        console.log(window.document.innerHTML);
    }

    stdin.on('data', function(chunk) {
        text += chunk;
    });

    stdin.on('end', function() {
        formatText(window, text);
    });
};

run(window);
