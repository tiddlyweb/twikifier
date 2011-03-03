// The closing of the frame that wraps the TiddlyWiki code.

// create the formatter global that is needed. Must be here
// at the end because we need to have config established.
// XXX Why is formatter a global!!!!
var formatter = new Formatter(config.formatters);

//clobber createTiddlyLink
function createTiddlyLink(place,title,includeText,className,isStatic,linkedFromTiddler,noToggle)
{
	var text = includeText ? title : null;
	var i = getTiddlyLinkInfo(title,className);
	var btn = createExternalLink(place,
                store.getTiddlerText("SiteUrl", null) + title)
        btn.className += ' ' + className;
	return btn;
}



// messages required for invokeMacro
merge(config.messages,{
    macroError: "Error in macro <<\%0>>",
    macroErrorDetails: "Error while executing macro <<\%0>>:\n%1",
    missingMacro: "No such macro"});

return [wikify, store, Tiddler];
}

if (typeof exports != "undefined")
    exports.createWikifier = createWikifier;
