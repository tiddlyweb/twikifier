"""
Serialization that uses twikifier to render.

Assumes for the time being that the necessary code 
is relative to the current page. Will come from config
eventually?
"""

from tiddlyweb.serializations.html import Serialization as HTMLSerialization

from tiddlyweb.web.util import escape_attribute_value

SERIALIZERS = {
    'text/html': ['twikified', 'text/html; charset=UTF-8'],
    'default': ['twikified', 'text/html; charset=UTF-8'],
}


def init(config):
    config['serializers'].update(SERIALIZERS)


class Serialization(HTMLSerialization):

    def tiddler_as(self, tiddler):
        """
        Send out the bare minimum required to make webtwik know there is 
        a tiddler.
        """
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
        tiddler_div = '<div class="tiddler" title="%s" %s></div>' % (
                escape_attribute_value(tiddler.title),
                self._tiddler_provenance(tiddler))
        self.environ['tiddlyweb.title'] = tiddler.title
        return tiddler_div + scripts

    def _tiddler_provenance(self, tiddler):
        if tiddler.recipe:
            return 'server.recipe="%s"' % escape_attribute_value(tiddler.recipe)
        else:
            return 'server.bag="%s"' % escape_attribute_value(tiddler.bag)
