const mediaElements = {
  'video': (mURI, mRes) => {
    const nv = document.createElement('video');
    nv.src = mURI;
    nv.type = mRes.headers.get('content-type');
    nv.controls = true;
    nv.muted = true;
    return nv;
  },
  'image': (mURI) => {
    const img = document.createElement('img');
    img.src = mURI;
    return img;
  }
};

async function onContentLoaded(backends) {
  const searchIn = document.getElementById('search_in')

  searchIn.addEventListener('keydown', async (e) => {
    if (e.code === 'Enter') {
      searchIn.disabled = true;
      document.getElementById('search_res_info').innerText = `Searching...`;
      const srEle = document.getElementById('search_res');

      while (srEle.firstChild) {
        srEle.removeChild(srEle.firstChild);
      }

      for (const beEnt of Object.entries(backends)) {
        const [_, beSpec] = beEnt;
        const res = await hlteFetch('/search', beSpec[1], undefined, { q: searchIn.value });
      
        if (res.ok) {
          try {
            const rJson = (await res.json()).reverse();
            const rowTmpl = document.getElementById('search_res_row_tmpl');
            const foundMedia = Object.keys(mediaElements).reduce((a, k) => ({ [k]: 0, ...a }), {});

            for (let row of rJson) {
              const newRow = rowTmpl.cloneNode(true);
              const nrC = (cid) => findChildByDataId(cid, newRow);
              newRow.removeAttribute('id');

              nrC('srr_ts').innerText = new Date(Number.parseInt(row.timestamp) / 1e6).toLocaleString();
              const pURL = new URL(row.primaryURI);
              nrC('srr_uris').innerHTML = `<a href="${row.primaryURI}" target="_blank">${pURL.hostname}</a>`;

              if (row.secondaryURI && row.secondaryURI.length) {
                const sURL = new URL(row.secondaryURI);
                nrC('srr_uris').innerHTML += `&nbsp;(<a href="${row.secondaryURI}" target="_blank">${sURL.hostname}</a>)`;

                try {
                  const mRes = await fetch(row.primaryURI);

                  if (mRes && mRes.ok && mRes.headers.has('content-type')) {
                    const ct = mRes.headers.get('content-type').split('/')[0];
                    if (mediaElements[ct]) {
                      newRow.appendChild(mediaElements[ct](row.primaryURI, mRes));
                      ++foundMedia[ct];
                    }

                    console.log(`${row.primaryURI} -> ${mRes.headers.get('content-type')}`);
                  }
                  else {
                    logger.error(`failed to fetch media ${row.primaryURI}`);
                    console.dir(mRes);
                  }
                } catch (err) {
                  logger.error(`failed to fetch media ${row.primaryURI} EXECPTION -> ${err}`);
                  console.dir(err);
                }
              }

              nrC('srr_hilite').innerText = row.hilite;

              if (row.annotation && row.annotation.length) {
                nrC('srr_ann').innerText = row.annotation;
              }

              srEle.appendChild(newRow);
            }

            document.getElementById('search_res_info').innerText = `${rJson.length} results ` + 
              `(${Object.entries(foundMedia).map(([m, c]) => `${c} ${m}${c > 1 ? 's' : ''}`).join(', ')})`;
          } catch (err) {
            logger.error(`failed to parse query result: ${err}`);
            document.getElementById('search_res_info').innerText = 'No results found!';
          }
        }
      }

      searchIn.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', sharedOnDOMContentLoaded.bind(null, onContentLoaded));