# Build Notes

In order to get the TiddlyWiki wikifier to work standalone, a great deal
of the TiddlyWiki code is required. Have a look at `TWREMOTES` in the
`Makefile` and the comments in `TwikifierBase.js`. The general overview
comment is that TiddlyWiki is non-functional: meaning its modules and methods
are tightly coupled with others, have many side effects and make use of 
data from globals rather than passed in parameters. This means that independent
code reuse is nigh on impossible.

That this is true is neither surprising, nor damning: TiddlyWiki was originally
built as a single file application. However since there is code in
there that could be useful if extracted and abstracted, hopefully this work
can point out some of the problems.

I tried to write down a simple dependency tree that explains how each
chunk of javascript requires another, but delineating the reasons got to be
too much so instead: What follows has less explanation than it could.

`twikifier` functionality currently lives in `twikify` and `TwikifierBase.js`.

`twikify` requires global `wikify()` in `Wikifier.js`.

`Wikifier.js` requires the global `formatter`, a `Formatter` from `FormatterHelpers.js`.

`FormatterHelpers.js` requires the global `config`, from `Config.js`.

A `Formatter` needs formatters, which are in `config` and defined in `Formatter.js`.

`Formatter.js` requires `FormatterHelper.js`, creating a cycle.

`Wikifier.js` requires global `createTiddlyText()`, from `Utilities.js`.

`Wikifier.js` requires global `createTiddlyElement()`, from `Utilities.js`.

`Formatter.js`, to format links, requires global `createTiddlyLink()` from `Utilities.js`.

`Utilities.js` requires the `pushUnique` modification to the `Array` prototype. This is found in `BasicTypes.js`.

`Formatter.js`, `FormatterHelpers.js`, `Utilities.js` all make use of a `store` global. A store, is a `TiddlyWiki` class, from `TiddlyWiki.js`.

`TiddlyWiki.js` calls `instanceof Tiddler` (4 times) and `new Tiddler` (twice), thus requiring `Tiddler.js`.

`Utilities.js` has `getTiddlyLinkInfo`, which requires `Lingo.js` for messages.
(`Lingo.js` requires `Config.js` and `Utilities.js` (for merge()).)

Presenting messages requires adding `format()` to the `String` prototype, thus requiring `Strings.js`.

This gets us to a working formatter, but not macros.

Adding `Macros.js` adds (limited, not yet tested) support for macros. `Macros.js` requires `Config.js`.

For macros to run, we need `invokeMacro`, which is from main.js. Rather
than including main.js (which has active code at the global level) I
made a copy of `invokeMacro`. It is not clear why the function definition
code is in main.

The difficulty here is not so much that there are a bunch of interdependencies,
but rather that the interdependencies are in the global scope and because
the files are simply building blocks for a single file, there are no clues
like import statements, namespaces, etc.
