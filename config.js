const config = {
  search: {
    templateObj: {
      url: 'search.html',
      height: 768,
      width: 768,
      type: 'popup'
    },
    titlePreface: 'hlte.net search',
    defaultLimit: 10,
    maxLimit: 8192
  },
  annotate: {
    templateObj: {
      url: 'popup.html',
      height: 420,
      width: 420,
      type: 'popup'
    },
    titlePreface: 'hlte.net page annotation',
  },
  defaultButtonContextMenu: 'search',
  assets: {
    host: 'https://static.hlte.net',
    icons: {
      main: 'icons8-crayon-64-blueedit.png',
      error: 'icons8-crayon-64-blueedit-errored.png',
      ok: 'icons8-crayon-64-blueedit-ok.png',
      key: 'icons8-key-32.png',
      nokey: 'icons8-no-key-32.png',
      lock: 'icons8-lock-32.png',
      unlock: 'icons8-unlock-32.png',
      delete: 'icons8-trash-32.png'
    }
  },
  backend: {
    pinVer: 20210320,
    ppHeader: 'x-hlte-pp'
  },
  styles: {
    light: '/light.css',
    dark: '/dark.css'
  }
};