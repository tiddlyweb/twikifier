
# The required pieces of code from the TiddlyWiki core.
TWREMOTES = BasicTypes.js Strings.js Config.js FormatterHelpers.js Formatter.js Tiddler.js TiddlyWiki.js Utilities.js TiddlerFields.js Wikifier.js Macros.js Dates.js Lingo.js
SPACELINK = http://svn.tiddlywiki.org/Trunk/contributors/PaulDowney/plugins/TiddlySpaceLinkPlugin/TiddlySpaceLinkPlugin.js

TESTERS := $(wildcard test/*.txt)
ASSERTS := $(wildcard test/*.js)

cat: get tsp
	cat TwikifierBase.js $(TWREMOTES) TiddlySpaceLinkPlugin.js TwikifierEnd.js > twikifier.js

clean:
	rm -f $(TWREMOTES) $(SPACELINK) twikifier.js
	find . -name "*.pyc" | xargs rm || true
	rm tiddlyweb.log || true
	rm -r store || true

tsp:
	curl -o TiddlySpaceLinkPlugin.js $(SPACELINK)

get: $(TWREMOTES)

%.js:
	curl -o $*.js https://github.com/TiddlyWiki/tiddlywiki/raw/master/js/$*.js

build: cat
	
test: build
	@for e in $(TESTERS); do echo "$$e#################################"; cat $$e | ./twikify --collection=http://cdent-test7.tiddlyspace.com/bags/cdent-test7_public/tiddlers; done

jstest: build
	@for e in $(ASSERTS); do echo $$e; ./$$e ; done
