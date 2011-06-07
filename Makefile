
# The required pieces of code from the TiddlyWiki core.
TWREMOTES = BasicTypes.js Strings.js Config.js ConfigBrowser.js Filters.js FormatterHelpers.js Formatter.js Tiddler.js TiddlyWiki.js Utilities.js TiddlerFields.js Wikifier.js Macros.js Dates.js Lingo.js
SPACELINK = https://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceLinkPlugin.js

TESTERS := $(wildcard test/*.txt)
ASSERTS := $(wildcard test/*.js)

cat: get 
	cat TwikifierBase.js $(TWREMOTES) TiddlySpaceLinkPlugin.js TwikifierEnd.js > twikifier.js

clean:
	rm -f $(TWREMOTES) TiddlySpaceLinkPlugin.js twikifier.js
	find . -name "*.pyc" | xargs rm || true
	rm tiddlyweb.log || true
	rm -r store || true

tsp:
	curl -Lo TiddlySpaceLinkPlugin.js $(SPACELINK)

get: $(TWREMOTES) tsp

%.js:
	curl -Lo $*.js https://github.com/TiddlyWiki/tiddlywiki/raw/master/js/$*.js

build: cat
	
test: build
	@for e in $(TESTERS); do echo "$$e#################################"; cat $$e | ./twikify --collection=http://cdent-test7.tiddlyspace.com/bags/cdent-test7_public/tiddlers; done

jstest: build
	@for e in $(ASSERTS); do echo $$e; ./$$e ; done
