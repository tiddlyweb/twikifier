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
        var urlString = store.getTiddlerText("SiteUrl");
        var linktext = urlString ? urlString + '/' + title : title;
        var btn = createExternalLink(place, linktext, text);
        btn.className += ' ' + className;
        return btn;
}

// clobber creatTagButton

function createTagButton(place,tag,excludeTiddler,title,tooltip)
{
    var taglink = serverOptions.container ?
        serverOptions.container + '?select=tag:' + encodeURIComponent(tag) :
            "/search?q=tag:" + encodeURIComponent(tag);
    var btn = createExternalLink(place, taglink, tag);
    return btn;
}

// messages required for invokeMacro
function createTiddlyError(place, msg, details) {
	jQuery(place).append("<!-- " + msg + "\n" + details + " -->");
}

// override createSpaceLink
function createSpaceLink(place, spaceName, title, alt, isBag) {
    var link, a;
    // XXX this needs to come from config or parameters
    link = serverOptions.host;

    // assumes a http URI without user:pass@ prefix
    link = link.replace("http://", "http://" + spaceName.toLowerCase() + ".");

    if (title) {
        a = createExternalLink(place, link + "/" +
                encodeURIComponent(title), alt || title);
    } else {
        a = createExternalLink(place, link, alt || spaceName);
    }
    jQuery(a).addClass('tiddlySpaceLink').attr('tiddler', title);
    jQuery(a).attr('tiddlyspace', spaceName);
    return a;
}

config.options.chkOpenInNewWindow = false;
config.evaluateMacroParameters = 'none';

return [wikify, store, Tiddler];
};

if (typeof exports != "undefined")
    exports.createWikifier = createWikifier;
