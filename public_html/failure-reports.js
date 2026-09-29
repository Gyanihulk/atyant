// Failure reports use the same station and individual asset inventory as schedules.
const failureDialog = document.querySelector('#failureDialog');
const failureForm = document.querySelector('#failureForm');
const failureList = document.querySelector('#failureReportList');
const failureFields = Object.fromEntries(['Station', 'Equipment', 'Asset', 'Date', 'Severity', 'Status', 'ReportedBy', 'RestoredOn', 'Details', 'Action'].map(name => [name, document.querySelector(`#failure${name}`)]));
const failureStorageKey = 'depotFailureReports';
let failureReports = [], editingFailureId = null, failureStorageReadable = true;
const failureNotice = document.createElement('p');
failureNotice.className = 'failure-notice';
failureNotice.setAttribute('role', 'status');
document.querySelector('.failure-report-meta').after(failureNotice);
const failureError = document.createElement('p');
failureError.className = 'failure-error';
failureError.setAttribute('role', 'alert');
failureForm.append(failureError);
const failureHelp = document.createElement('p');
failureHelp.className = 'failure-help';
failureHelp.id = 'failureAssetHelp';
failureFields.Asset.setAttribute('aria-describedby', failureHelp.id);
document.querySelector('.failure-fields').after(failureHelp);
try {
  const saved = JSON.parse(localStorage.getItem(failureStorageKey) || '[]');
  if (!Array.isArray(saved) || saved.some(report => !report || typeof report.id !== 'string' || typeof report.stationKey !== 'string' || typeof report.assetId !== 'string')) throw new Error('Invalid reports');
  failureReports = saved;
} catch {
  failureStorageReadable = false;
  failureNotice.textContent = 'Saved reports could not be read. Reload after checking browser storage; existing data will not be overwritten.';
}

const failureStations = groups.flatMap(group => group.stations.map(([name, code]) => ({key: `${group.code}|${name}`, name, code, group: group.name})));
function failureOption(value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}
function currentFailureReport() { return failureReports.find(report => report.id === editingFailureId); }
function populateFailureAssets(selectedId = '') {
  const {Station, Equipment, Asset} = failureFields;
  const units = unitsForKey(`${Station.value}|${Equipment.value}`);
  Asset.replaceChildren(failureOption('', 'Select an individual asset'));
  units.forEach(unit => Asset.append(failureOption(unit.id, unit.label)));
  const original = currentFailureReport();
  // Preserve historical reports even after their asset has been removed from inventory.
  if (original && original.stationKey === Station.value && original.equipment === Equipment.value && !units.some(unit => unit.id === original.assetId)) {
    Asset.append(failureOption(original.assetId, `${original.assetLabel} (removed from inventory)`));
  }
  Asset.value = selectedId;
  failureHelp.textContent = Asset.options.length === 1
    ? 'No assets here yet. Add an individual unit in Stations & assets, then return to log its failure.'
    : 'Choose the exact unit affected. Reports are saved in this browser on this device.';
}
function validateFailureDates() {
  const {Date: date, RestoredOn: restored, Status: status, Details: details} = failureFields;
  restored.required = status.value === 'Restored';
  restored.disabled = status.value !== 'Restored';
  restored.min = date.value;
  restored.setCustomValidity(!restored.disabled && restored.value && date.value && restored.value < date.value ? 'Restoration date cannot be before the failure date.' : '');
  details.setCustomValidity(details.value.trim() ? '' : 'Enter the failure details.');
}
function openFailureReport(report = null) {
  editingFailureId = report?.id || null;
  failureForm.reset();
  failureError.textContent = '';
  document.querySelector('#failureDialogTitle').textContent = report ? 'Edit Failure Report' : 'Log Failure Report';
  document.querySelector('#failureDialogContext').textContent = report ? 'Update this report, repair progress, and restoration details.' : 'Record a failure for a specific station asset.';
  failureFields.Station.replaceChildren(...failureStations.map(station => failureOption(station.key, `${station.name}${station.code ? ` (${station.code})` : ''} · ${station.group}`)));
  failureFields.Equipment.replaceChildren(...subcolumns.map(name => failureOption(name, name)));
  if (report) {
    failureFields.Station.value = report.stationKey;
    failureFields.Equipment.value = report.equipment;
  }
  populateFailureAssets(report?.assetId || '');
  const today = new Date();
  const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  for (const [field, key, fallback] of [['Date', 'date', localDate], ['Severity', 'severity', 'Medium'], ['Status', 'status', 'Open'], ['ReportedBy', 'reportedBy', ''], ['RestoredOn', 'restoredOn', ''], ['Details', 'details', ''], ['Action', 'action', '']]) {
    failureFields[field].value = report?.[key] || fallback;
  }
  validateFailureDates();
  failureDialog.showModal();
}
function renderFailureReports() {
  document.querySelector('#failureReportCount').textContent = String(failureReports.length).padStart(2, '0');
  failureList.innerHTML = failureReports.length ? [...failureReports].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.updatedAt || '').localeCompare(a.updatedAt || '')).map(report => {
    const station = failureStations.find(item => item.key === report.stationKey);
    const unit = unitsForKey(`${report.stationKey}|${report.equipment}`).find(item => item.id === report.assetId);
    const statusClass = report.status === 'Restored' ? 'restored' : report.status === 'Under Repair' ? 'repair' : 'open';
    return `<article class="failure-card"><div class="failure-card-heading"><div><span class="failure-station">${escapeHtml(station?.name || report.stationName || report.stationKey)}</span><h3>${escapeHtml(unit?.label || report.assetLabel)}</h3><p>${escapeHtml(report.equipment)} · ${escapeHtml(station?.group || '')}</p></div><span class="failure-badge ${statusClass}">${escapeHtml(report.status)}</span></div><dl class="failure-facts"><div><dt>Failure date</dt><dd>${formatScheduleDate(report.date)}</dd></div><div><dt>Severity</dt><dd>${escapeHtml(report.severity)}</dd></div><div><dt>Reported by</dt><dd>${escapeHtml(report.reportedBy || 'Not specified')}</dd></div>${report.restoredOn ? `<div><dt>Restored on</dt><dd>${formatScheduleDate(report.restoredOn)}</dd></div>` : ''}</dl><h4>Failure details</h4><p class="failure-text">${escapeHtml(report.details)}</p>${report.action ? `<h4>Action taken</h4><p class="failure-text">${escapeHtml(report.action)}</p>` : ''}<button type="button" class="failure-edit" data-edit-failure="${escapeHtml(report.id)}">Edit report ↗</button></article>`;
  }).join('') : '<p class="failure-empty">No failures reported yet. Use “Log failure report” to record an incident for a station asset.</p>';
}
failureForm.addEventListener('submit', event => {
  event.preventDefault();
  validateFailureDates();
  if (!failureForm.reportValidity()) return;
  if (!failureStorageReadable) {
    failureError.textContent = 'Reports cannot be saved while existing browser data is unreadable. Reload after checking browser storage.';
    return;
  }
  const original = currentFailureReport();
  const station = failureStations.find(item => item.key === failureFields.Station.value);
  const equipment = failureFields.Equipment.value;
  const unit = station && unitsForKey(`${station.key}|${equipment}`).find(item => item.id === failureFields.Asset.value);
  const historicalAsset = original && original.stationKey === station?.key && original.equipment === equipment && original.assetId === failureFields.Asset.value;
  if (!station || !subcolumns.includes(equipment) || (!unit && !historicalAsset)) {
    failureError.textContent = 'Select a station, equipment type, and individual asset before saving.';
    return;
  }
  const now = new Date().toISOString();
  const report = {
    id: original?.id || `failure-${makeUnitId()}`, createdAt: original?.createdAt || now, updatedAt: now,
    stationKey: station.key, stationName: station.name, equipment, assetId: failureFields.Asset.value,
    assetLabel: unit?.label || original.assetLabel, date: failureFields.Date.value,
    severity: failureFields.Severity.value, status: failureFields.Status.value,
    reportedBy: failureFields.ReportedBy.value.trim(),
    restoredOn: failureFields.Status.value === 'Restored' ? failureFields.RestoredOn.value : '',
    details: failureFields.Details.value.trim(), action: failureFields.Action.value.trim()
  };
  const next = original ? failureReports.map(item => item.id === original.id ? report : item) : [...failureReports, report];
  try { localStorage.setItem(failureStorageKey, JSON.stringify(next)); }
  catch {
    failureError.textContent = 'Could not save the report in this browser. Your edits are still here; free browser storage or allow site storage and try again.';
    return;
  }
  failureReports = next;
  renderFailureReports();
  failureDialog.close();
  failureNotice.textContent = original ? 'Failure report updated and saved on this device.' : 'Failure report added and saved on this device.';
});
document.querySelector('#addFailureReport').addEventListener('click', () => openFailureReport());
failureList.addEventListener('click', event => {
  const button = event.target.closest('[data-edit-failure]');
  if (button) openFailureReport(failureReports.find(report => report.id === button.dataset.editFailure));
});
failureFields.Station.addEventListener('change', () => populateFailureAssets());
failureFields.Equipment.addEventListener('change', () => populateFailureAssets());
failureForm.addEventListener('input', () => { failureError.textContent = ''; validateFailureDates(); });
failureForm.addEventListener('change', validateFailureDates);
document.querySelector('#closeFailureDialog').addEventListener('click', () => failureDialog.close());
document.querySelector('#cancelFailureReport').addEventListener('click', () => failureDialog.close());
dialog.addEventListener('close', renderFailureReports);
renderFailureReports();
