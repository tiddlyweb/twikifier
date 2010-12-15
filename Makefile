
# The required pieces of code from the TiddlyWiki core.
TWREMOTES = BasicTypes.js Strings.js Config.js Lingo.js Dom.js FormatterHelpers.js Formatter.js Tiddler.js TiddlyWiki.js Utilities.js Wikifier.js Macros.js

cat: get
	cat TwikifierBase.js $(TWREMOTES) Test.js > twikifier.js

clean:
	rm $(TWREMOTES) twikifier.js

get: $(TWREMOTES)

%.js:
	curl -o $*.js http://svn.tiddlywiki.org/Trunk/core/js/$*.js
	
test: cat
	node twikifier.js
