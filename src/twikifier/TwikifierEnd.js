// The closing of the frame that wraps the TiddlyWiki code.

// create the formatter global that is needed. Must be here
// at the end because we need to have config established.
// XXX Why is formatter a global!!!!
var formatter = new Formatter(config.formatters);

//clobber createTiddlyLink
function createTiddlyLink(place,title,includeText,className,isStatic,linkedFromTiddler,noToggle)
{
	var text = includeText ? title : null;
	var linktext = encodeURIComponent(title);
	var btn = createExternalLink(place, linktext, text);
	var linkInfo = getTiddlyLinkInfo(title);
	if (className) {
		btn.className = linkInfo.classes + ' ' + className;
	} else {
		btn.className = linkInfo.classes;
	}
	return btn;
}

// clobber creatTagButton
@@createTagButton

// messages required for invokeMacro
function createTiddlyError(place, msg, details) {
	jQuery(place).append("<!-- " + msg + "\n" + details + " -->");
}

// override createSpaceLink
@@createSpaceLink

config.options.chkOpenInNewWindow = false;
config.evaluateMacroParameters = 'none';

return [wikify, store, Tiddler];
};

if (exports !== "undefined")
	exports.createWikifier = createWikifier;
