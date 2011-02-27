
# The required pieces of code from the TiddlyWiki core.
TWREMOTES = BasicTypes.js Strings.js Config.js FormatterHelpers.js Formatter.js Tiddler.js TiddlyWiki.js Utilities.js TiddlerFields.js Wikifier.js Macros.js Dates.js Lingo.js

TESTERS := $(wildcard test/*.txt)
ASSERTS := $(wildcard test/*.js)

cat: get
	cat TwikifierBase.js $(TWREMOTES) TwikifierEnd.js Test.js > twikifier.js

clean:
	rm -f $(TWREMOTES) twikifier.js

get: $(TWREMOTES)

%.js:
	curl -o $*.js http://svn.tiddlywiki.org/Trunk/core/js/$*.js

build: cat
	
test: build
	@for e in $(TESTERS); do echo "$$e#################################"; cat $$e | node twikifier.js http://cdent-test7.tiddlyspace.com/bags/cdent-test7_public/tiddlers; done

jstest: build
	@for e in $(ASSERTS); do echo $$e; ./$$e ; done
