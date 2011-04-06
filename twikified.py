"""
Serialization that uses twikifier to render.

It can render in two ways. If config['twikified.render'] is
True, then rendering will be done serverside against a command
line node client called twikify. Otherwise rendering will be
delegated to the client.

The twikify script is located at config['twikified.twikify'],
'./twikify' by default. NODE_PATH handling is up to the installer
at this point.

If client side rendering is used, then a bunch of javascript is
expected to be found in config['twikified.container'], defaulting
to '/bags/common/tiddlers/'. The installer is expected to get the
right tiddlers in the right place (for now).
"""

import subprocess

from tiddlywebplugins.atom.htmllinks import Serialization as HTMLSerialization

from tiddlyweb.model.bag import Bag
from tiddlyweb.model.recipe import Recipe
from tiddlyweb.web.util import (escape_attribute_value, html_encode,
        encode_name, recipe_url, bag_url)


SERIALIZERS = {
    'text/html': ['twikified', 'text/html; charset=UTF-8'],
    'default': ['twikified', 'text/html; charset=UTF-8'],
}


def init(config):
    config['serializers'].update(SERIALIZERS)
    config['wikitext.default_renderer'] = 'twikified'


def render(tiddler, environ):
    if tiddler.recipe:
        collection = recipe_url(environ, Recipe(tiddler.recipe)) + '/tiddlers'
    else:
        collection = bag_url(environ, Bag(tiddler.bag)) + '/tiddlers'
    # let any errors raise themselves
    twikify = environ['tiddlyweb.config'].get('twikified.twikify',
            './twikify')
    text = subprocess.Popen([twikify, '--collection=%s' % collection],
            stdout=subprocess.PIPE,
            stdin=subprocess.PIPE).communicate(tiddler.text)[0]
    return text.decode('UTF-8')


class Serialization(HTMLSerialization):

    def _render(self, tiddler):
        return HTMLSerialization.tiddler_as(self, tiddler)

    def tiddler_as(self, tiddler):
        """
        Send out the bare minimum required to make webtwik know there is 
        a tiddler.
        """
        # branch away if we are going to use the render system
        if self.environ['tiddlyweb.config'].get('twikified.render', True):
            return self._render(tiddler)

        common_container = self.environ.get(
                'tiddlyweb.config', {}).get(
                        'twikified.container', '/bags/common/tiddlers/')
        scripts = """
<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.4/jquery.min.js"
    type="text/javascript"></script>
<script>
    $.ajaxSetup({
        beforeSend: function(xhr) {
            xhr.setRequestHeader("X-ControlView",
            "false");
        }
    });
</script>
<script src="%(container)stwikifier" type="text/javascript"></script>
<script src="%(container)stwik" type="text/javascript"></script>
<script src="%(container)swebtwik" type="text/javascript"></script>
""" % {'container': common_container}
        tiddler_div = '<div class="tiddler" title="%s" %s><pre>%s</pre></div>' % (
                escape_attribute_value(tiddler.title),
                self._tiddler_provenance(tiddler),
                self._text(tiddler))
        self.environ['tiddlyweb.title'] = tiddler.title
        return tiddler_div + scripts

    def _text(self, tiddler):
        print tiddler.type
        if not tiddler.type or tiddler.type == 'None':
            return html_encode(tiddler.text)
        return ''

    def _tiddler_provenance(self, tiddler):
        if tiddler.recipe:
            return 'server.recipe="%s"' % escape_attribute_value(tiddler.recipe)
        else:
            return 'server.bag="%s"' % escape_attribute_value(tiddler.bag)
