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
      document.getElementById('search_res_info').textContent = `Searching...`;
      const srEle = document.getElementById('search_res');

      while (srEle.firstChild) {
        srEle.removeChild(srEle.firstChild);
      }

      for (const beEnt of Object.entries(backends)) {
        const [_, beSpec] = beEnt;
        const startTs = Date.now();
        const res = await hlteFetch('/search', beSpec[1], undefined, { q: searchIn.value });
      
        if (res.ok) {
          try {
            const rJson = await res.json();

            if (!rJson) {
              document.getElementById('search_res_info').textContent = 'No results found!';
              continue;
            }

            const rowTmpl = document.getElementById('search_res_row_tmpl');
            const foundMedia = Object.keys(mediaElements).reduce((a, k) => ({ [k]: 0, ...a }), {});

            rJson.reverse();
            for (let row of rJson) {
              const newRow = rowTmpl.cloneNode(true);
              const nrC = (cid) => findChildByDataId(cid, newRow);
              newRow.removeAttribute('id');

              nrC('srr_ts').textContent = new Date(Number.parseInt(row.timestamp) / 1e6).toLocaleString();
              const pURL = new URL(row.primaryURI);
              const pLink = document.createElement('a');
              pLink.href = row.primaryURI;
              pLink.textContent = pURL.hostname;
              nrC('srr_uris').appendChild(pLink);

              if (row.secondaryURI && row.secondaryURI.length) {
                const sURL = new URL(row.secondaryURI);
                const sLink = document.createElement('a');
                sLink.href = row.secondaryURI;
                sLink.textContent = `(${sURL.hostname})`;
                nrC('srr_uris').appendChild(sLink);

                try {
                  const mRes = await fetch(row.primaryURI);

                  if (mRes && mRes.ok && mRes.headers.has('content-type')) {
                    const ct = mRes.headers.get('content-type').split('/')[0];
                    if (mediaElements[ct]) {
                      newRow.appendChild(mediaElements[ct](row.primaryURI, mRes));
                      ++foundMedia[ct];
                    } else {
                      console.log(`Unhandled media type: ${row.primaryURI} -> ${mRes.headers.get('content-type')}`);
                    }
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

              nrC('srr_hilite').textContent = row.hilite;

              if (row.annotation && row.annotation.length) {
                nrC('srr_ann').textContent = row.annotation;
              }

              srEle.appendChild(newRow);
            }

            document.getElementById('search_res_info').textContent = `${rJson.length} results ` + 
              `(${Object.entries(foundMedia).map(([m, c]) => `${c} ${m}${c > 1 ? 's' : ''}`).join(', ')})` +
              ` -- ${Date.now() - startTs}ms`;
          } catch (err) {
            logger.error(`failed to parse query result: ${err}`);
          }
        }
      }

      searchIn.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', sharedOnDOMContentLoaded.bind(null, onContentLoaded));