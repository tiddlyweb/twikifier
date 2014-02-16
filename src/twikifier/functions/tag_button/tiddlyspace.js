function createTagButton(element, tag) {
  var taglink = serverOptions.container ?
    serverOptions.container + '?select=tag:' + encodeURIComponent(tag) :
    "/search?q=tag:" + encodeURIComponent(tag);
  var button = createExternalLink(element, taglink, tag);
  return button;
}