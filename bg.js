'use strict';

let annotateHandle;

const annotateListener = async (info) => {
  const { pageUrl, srcUrl } = info;
  const msgObj = { action: 'annotateMedia', pageUrl, srcUrl };

  if (info.selectionText) {
    msgObj.buttonCaptureHilite = info.selectionText;
  }

  theRealBrowser.tabs.query({ active: true }, async (t) => {
    theRealBrowser.tabs.sendMessage(t.find(x => x.active).id, msgObj);
  });
};

const bgScriptMain = async () => {
  const curOpts = await hlteOptions();
  const curCtxMenu = curOpts.buttonContextMenu || config.defaultButtonContextMenu;
  console.log('loading bg, curCtxMenu', curCtxMenu, curOpts);
  createButtonContextMenuFor(curCtxMenu);

  annotateHandle = theRealBrowser.contextMenus.create({
    title: 'Hilite media',
    contexts: ['image', 'video'],
    visible: true,
    id: 'ctx_menu',
    onclick: annotateListener
  }, logIfError.bind(null, 'annotate'));

  theRealBrowser.contextMenus.create({
    title: 'Hilite',
    contexts: ['selection'],
    visible: true,
    id: 'hilite_menu',
    onclick: annotateListener
  }, logIfError.bind(null, 'hilite_menu'));
};

bgScriptMain();
