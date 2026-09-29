// Documents live in IndexedDB, separate from the small schedule records.
const pdfPanel = document.createElement('section');
pdfPanel.className = 'schedule-pdf-panel';
pdfPanel.innerHTML = `<h3>Schedule PDFs</h3><label for="schedulePdfUpload">Upload PDF documents</label><input id="schedulePdfUpload" type="file" accept=".pdf,application/pdf" multiple><p>Up to 10 MB per PDF. Documents save immediately for this asset and interval, in this browser on this device. Clear this interval clears schedule fields; use Remove below to delete a PDF.</p><p id="schedulePdfStatus" role="status" aria-live="polite"></p><ul id="schedulePdfList"></ul>`;
notes.after(pdfPanel);
const pdfInput = document.querySelector('#schedulePdfUpload');
const pdfList = document.querySelector('#schedulePdfList');
const pdfStatus = document.querySelector('#schedulePdfStatus');
let pdfDatabase, pdfRenderVersion = 0, pdfUrls = [];
function pdfScope() {return JSON.stringify([scheduleKey(),activeUnitId,activeInterval]);}
function openPdfDatabase() {
  if (!pdfDatabase) pdfDatabase = new Promise((resolve,reject) => {
    const request = indexedDB.open('gatividyut-schedule-pdfs',1);
    request.onupgradeneeded = () => request.result.createObjectStore('documents',{keyPath:'id'}).createIndex('scope','scope');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(error => {pdfDatabase=null;throw error;});
  return pdfDatabase;
}
async function pdfTransaction(mode,operation) {
  const db = await openPdfDatabase();
  return new Promise((resolve,reject) => {
    const tx = db.transaction('documents',mode), request=operation(tx.objectStore('documents'));
    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = tx.onabort = () => reject(tx.error || new Error('Document storage failed'));
  });
}
async function renderSchedulePdfs() {
  const version=++pdfRenderVersion, scope=pdfScope();
  pdfUrls.forEach(url=>URL.revokeObjectURL(url));pdfUrls=[];
  pdfList.replaceChildren();pdfStatus.textContent='Loading documents…';pdfInput.value='';
  try {
    const documents = await pdfTransaction('readonly',store=>store.index('scope').getAll(scope));
    if (version!==pdfRenderVersion) return;
    pdfStatus.textContent=documents.length ? `${documents.length} PDF document${documents.length===1?'':'s'} saved.` : 'No PDFs uploaded for this interval.';
    for (const documentRecord of documents) {
      const row=document.createElement('li'), title=document.createElement('span');
      title.textContent=`${documentRecord.name} (${(documentRecord.blob.size/1024).toFixed(0)} KB)`;
      const url=URL.createObjectURL(documentRecord.blob);pdfUrls.push(url);
      const view=document.createElement('a');view.href=url;view.target='_blank';view.rel='noopener';view.textContent='Open PDF';
      const download=document.createElement('a');download.href=url;download.download=documentRecord.name;download.textContent='Download';
      const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.setAttribute('aria-label',`Remove ${documentRecord.name}`);
      remove.onclick=async()=>{
        if (!confirm(`Remove ${documentRecord.name} from this schedule?`)) return;
        remove.disabled=true;
        try {await pdfTransaction('readwrite',store=>store.delete(documentRecord.id));if(scope===pdfScope())await renderSchedulePdfs();}
        catch {if(scope===pdfScope())pdfStatus.textContent='Could not remove the PDF. Please try again.';remove.disabled=false;}
      };
      row.append(title,view,download,remove);pdfList.append(row);
    }
  } catch {if(version===pdfRenderVersion)pdfStatus.textContent='PDF storage is unavailable in this browser. Allow site storage and try again.';}
}
pdfInput.addEventListener('change',async()=>{
  const files=[...pdfInput.files], scope=pdfScope();
  pdfInput.disabled=true;pdfStatus.textContent='Saving PDFs…';
  const failures=[];
  for(const file of files) {
    try {
      if(!/\.pdf$/i.test(file.name))throw new Error('Please select a PDF file');
      if(file.size>10*1024*1024)throw new Error('PDF exceeds the 10 MB limit');
      if(!new TextDecoder().decode(await file.slice(0,1024).arrayBuffer()).includes('%PDF-'))throw new Error('File is not a valid PDF');
      const blob=new Blob([file],{type:'application/pdf'});
      await pdfTransaction('readwrite',store=>store.add({id:crypto.randomUUID(),scope,name:file.name,blob}));
    } catch(error) {failures.push(`${file.name}: ${error.name==='QuotaExceededError'?'Browser storage is full':error.message || 'Could not save PDF'}.`);}
  }
  pdfInput.disabled=false;
  if(scope===pdfScope()) {await renderSchedulePdfs();if(failures.length)pdfStatus.textContent=failures.join(' ');}
});
const showIntervalWithoutPdfs = showInterval;
showInterval = function() {showIntervalWithoutPdfs();renderSchedulePdfs();};
