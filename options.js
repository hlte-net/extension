'use strict';

const InputCheckboxes = ['post_upstream', 'inf_csv', 'inf_json', 'inf_sqlite'];

function saveOptions() {
  const settings = InputCheckboxes.reduce((a, settingId) => {
    return { [settingId]: document.getElementById(settingId).checked, ...a };
  }, {});

  const imgEle = document.getElementById('logo_img');
  imgEle.style.filter = 'grayscale(1.0)';

  theRealBrowser.storage.sync.set(settings, () => {
    const ogSrc = imgEle.src;
    imgEle.style.filter = 'grayscale(0)';
    imgEle.src = `${assetHost}/${assets.icons.ok}`;
    setTimeout(() => {
      imgEle.src = ogSrc;
    }, 1500);
  });
}

function restoreOptions() {
  theRealBrowser.storage.sync.get(InputCheckboxes, (settings) => {
    Object.keys(settings).forEach((settingId) => document.getElementById(settingId).checked = settings[settingId]);
  });

  theRealBrowser.storage.sync.get('user_id', (userId) => {
    console.log('userId');
    console.log(userId);

    const unlockAll = () => {
      InputCheckboxes.forEach((ic) => document.getElementById(ic).disabled = false);
      document.getElementById('save').disabled = false;
    };

    const uidEle = document.getElementById('user_id');
    const setButton = document.getElementById('set_uid');
    
    if (Object.keys(userId).length > 0) {
      uidEle.value = userId.user_id;
      uidEle.disabled = true;
      setButton.style.display = 'none';
      unlockAll();
    } else {
      setButton.addEventListener('click', (ev) => {
        ev.preventDefault();
        if (uidEle.value.length > 0) {
          // register uid! if extant, prompt for passphrase
          theRealBrowser.storage.sync.set({ user_id: uidEle.value }, () => unlockAll());
        }
      });
    }
  });
}

document.getElementById('save').addEventListener('click', (ev) => {
  ev.preventDefault();
  saveOptions();
});

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await discoverBackends())) {
    document.getElementById('form_container').style.display = 'none';
    document.getElementById('error_container').style.display = 'block';
    document.getElementById('logo_img').src = `${assetHost}/${assets.icons.error}`;
  } else {
    restoreOptions();

    if (Object.keys(backends).some(x => x.indexOf('localhost') !== -1)) {
      document.getElementById('local_container').style.display = 'block';
    }

    if (!Object.keys(backends).some(x => x.indexOf('api.hlte.net') !== -1)) {
      document.getElementById('hlte_container').style.display = 'none';
    }

    document.getElementById('info_box').style.display = 'block';
    document.getElementById('info_container').innerHTML = `Backends: ${Object.keys(backends).join(', ')}`;
  }
});