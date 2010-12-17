// create a function scope (this is closed in another file)
var createWikifier = function(window, jQuery) {

/*** psuedo-globals required to get rolling ***/

// the version macro needs this
var version = {
    major: 0,
    minor: 1,
    revision: 0
};

// config.js won't process without a navigator
var navigator = { userAgent: "twikifier" };  

// XXX TiddlyWiki requires a document global, rather than
// being passed that document in startup.
var document = window.document;

// XXX TiddlyWiki requires a store global, rather than it
// being passed where needed.
var store = new TiddlyWiki();

// XXX The findContainingTiddler method on story is required for
// invokeMacro to process, but we don't actually need it to really
// do anything.
var story = {
    findContainingTiddler: function(e) { return e; }
};

// provide a stubbed alert in case something calls it
function alert(e) {
    console.log(e);
}

// stub out saveChanges
// XXX Lingo.js won't process without saveChanges defined
function saveChanges(x, y) {
    return;
}

// incorporate invokeMacro by hand, including main.js causes problems
// XXX why is invokeMacro in main.js? Why are there any function other
// than main in main.js?
function invokeMacro(place,macro,params,wikifier,tiddler)
{
    try {
        var m = config.macros[macro];
        if(m && m.handler) {
            var tiddlerElem = story.findContainingTiddler(place);
            //# Provide context for evaluated macro parameters (eg <<myMacro {{tiddler.title}}>>)
            window.tiddler = tiddlerElem ? store.getTiddler(tiddlerElem.getAttribute("tiddler")) : null;
            window.place = place;
            var allowEval = true;
            if(config.evaluateMacroParameters=="system") {
                if(!tiddler || tiddler.tags.indexOf("systemAllowEval") == -1) {
                    allowEval = false;
                }
            }
            m.handler(place,macro,m.noPreParse?null:params.readMacroParams(!allowEval),wikifier,params,tiddler);
        } else {
            createTiddlyError(place,config.messages.macroError.format([macro]),config.messages.macroErrorDetails.format([macro,config.messages.missingMacro]));
        }
    } catch(ex) {
        createTiddlyError(place,config.messages.macroError.format([macro]),config.messages.macroErrorDetails.format([macro,ex.toString()]));
    }
}
