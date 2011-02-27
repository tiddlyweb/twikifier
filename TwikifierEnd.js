// The closing of the frame that wraps the TiddlyWiki code.

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

if (!exports)
    exports = {}
exports.createWikifier = createWikifier;
