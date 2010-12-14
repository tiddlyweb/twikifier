
// This is not really a test, it's just a way to experiment.
// XXX Testing should come soon.
console.log('testing start');

// Creater formatter.
// XXX Why is formatter a global!!!!
var formatter = new Formatter(config.formatters);

// Establish a place where we are doing to add our
// info. We use the thing with id tiddler. The upstream
// dom document creator has establish an HTML frame with a body.
var place = document.getElementById('tiddler');;

// Set the text to something to format.
var text = "Well hello SomeBody, how goes?\n\
We miss you\n\
<<today>>\n\
<<version>>\n\
";

// wikify the tiddler text.
// XXX This should be functional, returning a string,
// not building up the dom in place.
wikify(text, place, null, null);

console.log('wikitext#######');
console.log(text);
console.log('HTML###########');
console.log(document.innerHTML);
console.log('testing end');
