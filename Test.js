
// read stdin to get text
var stdin = process.openStdin();
stdin.setEncoding('utf8');
var text = '';

// Create formatter.
// XXX Why is formatter a global!!!!
var formatter = new Formatter(config.formatters);

var formatText = function(text) {
    var place = document.getElementById('tiddler');;

    // wikify the tiddler text.
    // XXX This should be functional, returning a string,
    // not building up the dom in place.
    wikify(text, place, null, null);

    console.log(document.innerHTML);
}

stdin.on('data', function(chunk) {
    text += chunk;
});

stdin.on('end', function() {
    formatText(text);
});
