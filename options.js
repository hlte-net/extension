'use strict';

const InputCheckboxes = ['post_upstream'];

async function saveOptions() {
  const settings = InputCheckboxes.reduce((a, settingId) => {
    return { [settingId]: document.getElementById(settingId).checked, ...a };
  }, {});

  const imgEle = document.getElementById('logo_img');
  imgEle.style.filter = 'grayscale(1.0)';

  const curOptions = await hlteOptions();
  curOptions.formats = settings;
  await hlteOptions(curOptions);

  const ogSrc = imgEle.src;
  imgEle.style.filter = 'grayscale(0)';
  imgEle.src = `${assetHost}/${assets.icons.ok}`;
  setTimeout(() => {
    imgEle.src = ogSrc;
  }, 1500);
}

const unlockAll = () => {
  InputCheckboxes.forEach((ic) => document.getElementById(ic).disabled = false);
  document.getElementById('save').disabled = false;
};

async function restoreOptions() {
  const allOpts = await hlteOptions();

  if (allOpts.formats) {
    Object.keys(allOpts.formats).forEach((settingId) => {
      const ele = document.getElementById(settingId);
      if (ele) {
        ele.checked = allOpts.formats[settingId];
      }
    });
  }

  const userId = allOpts.userId;

  const uidEle = document.getElementById('user_id');
  const setButton = document.getElementById('set_uid');
  
  if (userId && userId.length > 0) {
    uidEle.value = userId;
    uidEle.disabled = true;
    setButton.style.display = 'none';
    unlockAll();
  } else {
    setButton.addEventListener('click', async (ev) => {
      ev.preventDefault();
      if (uidEle.value.length > 0) {
        allOpts.userId = uidEle.value;
        await hlteOptions(allOpts);
        //TODO: register uid! if extant, prompt for passphrase
      }
    });
  }
}

async function contentLoaded() {
  if (!(await discoverBackends())) {
    document.getElementById('form_container').style.display = 'none';
    document.getElementById('error_container').style.display = 'block';
    document.getElementById('logo_img').src = `${assetHost}/${assets.icons.error}`;
  } else {
    if (Object.keys(backends).some(x => x.indexOf('localhost') !== -1)) {
      document.getElementById('local_container').style.display = 'block';
      const formatCont = document.getElementById('local_formats');
      const formatTmpl = document.getElementById('local_format_tmpl');
      const formats = await localFormats();

      if (formats.length === 0) {
        return;
      }

      formats.forEach((format) => {
        const newNode = formatTmpl.cloneNode(true);
        newNode.removeAttribute('id');

        const checkbox = findChildByDataId('cbox', newNode);
        const label = findChildByDataId('label', newNode);

        checkbox.id = `inf_${format}`;
        label.appendChild(document.createTextNode(format));
        InputCheckboxes.push(checkbox.id);

        newNode.style.display = '';
        formatCont.appendChild(newNode);
      });

      unlockAll();
    }

    if (!Object.keys(backends).some(x => x.indexOf('api.hlte.net') !== -1)) {
      document.getElementById('hlte_container').style.display = 'none';
    }

    document.getElementById('info_box').style.display = 'block';

    restoreOptions();
  }
}

document.getElementById('save').addEventListener('click', async (ev) => {
  ev.preventDefault();
  await saveOptions();
});

document.getElementById('reset').addEventListener('click', async (ev) => {
  ev.preventDefault();
  await hlteOptions({ formats: [] });
  await contentLoaded();
});

document.addEventListener('DOMContentLoaded', contentLoaded);