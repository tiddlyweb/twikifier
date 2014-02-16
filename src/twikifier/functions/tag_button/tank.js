function createTagButton(element, tag) {
  var taglink;
  if (serverOptions.container) {
    if (serverOptions.container.match(/\/recipes\//)) {
      taglink = serverOptions.container + '?select=tag:'
        + encodeURIComponent(tag);
    } else {
      var bag = serverOptions.container.replace(
        /.*\/bags\/([^\/]*)\/.*/, "$1");
      taglink = '/search?q=bag:"' + encodeURIComponent(bag)
        + '"%20tag:"' + encodeURIComponent(tag) + '"';
    }
  } else {
    taglink = '/search?q=tag:"' + encodeURIComponent(tag) + '"';
  }

  var button = createExternalLink(element, taglink, tag);
  return button;
}