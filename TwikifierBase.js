
// require the jsdom and jquery libraries, via NODE_PATH
// (probably /usr/local/lib/node if you are using npm)
var jsdom = require('jsdom');
var jquery = require('jquery');

/*** globals required to get rolling ***/

// the version macro needs this
var version = {
    major: 0,
    minor: 1,
    revision: 0
};

// config.js won't process without a navigator
var navigator = { userAgent: "twikifier" };  


// create a browser window
var window = jsdom.jsdom(
        '<html><head></head><body><div id="tiddler"></div></body></html>'
    ).createWindow(); 
// jquery-ize the window
var jQuery = jquery.create(window);

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
