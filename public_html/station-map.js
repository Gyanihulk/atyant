// Station positions and codes transcribed from the supplied PDF.
const stationMapPoints = verifiedMapStations;

function calendarDayNumber(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year,month,day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month-1 && date.getUTCDate() === day ? date.getTime()/86400000 : null;
}
function localCalendarDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
function mapStationStatus(point, today = localCalendarDate()) {
  const entries = [], todayNumber = calendarDayNumber(today);
  let linked = false;
  for (const group of groups) for (const [station,code] of group.stations) {
    if (!point.codes.includes(code) && !(point.code === 'NGRT' && !code && station === 'Nagrota')) continue;
    linked = true;
    for (const equipment of subcolumns) for (const unit of unitsForKey(`${group.code}|${station}|${equipment}`)) {
      (unit.schedules || []).forEach((value,interval) => {
        const record = normalizeSchedule(value);
        if (!scheduleHasData(record)) return;
        const due = calendarDayNumber(record.nextDue);
        entries.push({group:group.code,station,equipment,unit:unit.id,label:unit.label,rating:unit.rating || '',interval,record,daysOverdue:due === null || todayNumber === null ? 0 : Math.max(0,todayNumber-due)});
      });
    }
  }
  entries.sort((a,b) => b.daysOverdue-a.daysOverdue);
  const daysOverdue = entries[0]?.daysOverdue || 0;
  const color = daysOverdue > 3 ? 'red' : daysOverdue > 0 ? 'yellow' : 'green';
  const description = daysOverdue ? `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue` : entries.length ? 'No overdue schedules' : 'No schedules recorded';
  return {color,description,daysOverdue,entries,linked};
}

const mapFrame = document.querySelector('.official-map-frame');
const mapImage = mapFrame.querySelector('img');
const mapViewport = document.createElement('div');
mapViewport.className = 'station-map-viewport';
mapViewport.tabIndex = 0;
mapViewport.setAttribute('aria-label','Station status map. Use zoom controls and scroll to explore.');
const mapCanvas = document.createElement('div');
mapCanvas.className = 'station-map-canvas';
const mapArtwork = document.createElement('div');
mapArtwork.className = 'station-map-artwork';
mapArtwork.append(mapImage);
mapCanvas.append(mapArtwork);
mapViewport.append(mapCanvas);
mapFrame.replaceWith(mapViewport);
const mapTools = document.createElement('div');
mapTools.className = 'station-map-tools';
mapTools.innerHTML = '<div class="map-light-legend"><span><i class="green"></i>Green · no overdue schedule</span><span><i class="yellow"></i>Yellow · 1–3 days overdue</span><span><i class="red"></i>Red · over 3 days overdue</span></div><div class="map-zoom"><button type="button" id="mapZoomOut" aria-label="Zoom out map">−</button><output id="mapZoomValue">100%</output><button type="button" id="mapZoomIn" aria-label="Zoom in map">+</button><button type="button" id="mapZoomReset">Fit map</button></div><label class="map-station-picker">Find a map station<select id="mapStationSelect"><option value="">Select a station to view its schedules</option></select></label><p>Lights update when schedules are saved and every minute while this page is open. Due today stays green. Green also includes stations with no recorded schedules; select a light for details.</p>';
mapViewport.before(mapTools);
const mapStatusOverview = document.createElement('div');
mapStatusOverview.className = 'map-status-overview';
mapStatusOverview.innerHTML = '<div class="map-status-intro"><span class="map-live-label"><i></i>MAINTENANCE MONITOR</span><h3>Your network at a glance</h3><p>Station lights reflect the most overdue schedule.</p></div><div class="map-status-totals" aria-label="Status counts for mapped stations"><div class="map-status-total green"><span><i></i>No overdue</span><strong id="mapGreenTotal">0</strong><small>Includes unrecorded schedules</small></div><div class="map-status-total yellow"><span><i></i>Attention</span><strong id="mapYellowTotal">0</strong><small>1–3 days overdue</small></div><div class="map-status-total red"><span><i></i>Overdue</span><strong id="mapRedTotal">0</strong><small>More than 3 days overdue</small></div></div><p class="map-count-note">102 station markers from the supplied jurisdiction PDF. Source includes Batala marked as excluding.</p>';
mapTools.before(mapStatusOverview);
const mapTooltip = document.createElement('div');
mapTooltip.className = 'map-marker-tooltip';
mapTooltip.id = 'mapMarkerTooltip';
mapTooltip.setAttribute('role','tooltip');
mapTooltip.hidden = true;
document.body.append(mapTooltip);
function showMapTooltip(marker) {
  mapTooltip.textContent = marker.getAttribute('aria-label');
  mapTooltip.hidden = false;
  const box = marker.getBoundingClientRect(), tip = mapTooltip.getBoundingClientRect();
  mapTooltip.style.left = `${Math.max(8,Math.min(innerWidth-tip.width-8,box.left+box.width/2-tip.width/2))}px`;
  mapTooltip.style.top = `${box.top > tip.height+16 ? box.top-tip.height-10 : box.bottom+10}px`;
}
function hideMapTooltip(){mapTooltip.hidden=true}
mapViewport.addEventListener('scroll',hideMapTooltip);
window.addEventListener('scroll',hideMapTooltip,true);
window.addEventListener('resize',hideMapTooltip);
document.addEventListener('keydown',event=>{if(event.key==='Escape')hideMapTooltip()});
const mapDetail = document.createElement('section');
mapDetail.className = 'map-station-detail';
mapDetail.setAttribute('aria-label','Selected station schedule status');
mapDetail.innerHTML = '<p>Select a station light or choose a station above to view its maintenance status.</p>';
mapViewport.after(mapDetail);
const mapOverdueDialog = document.createElement('dialog');
mapOverdueDialog.className = 'map-overdue-dialog';
mapOverdueDialog.setAttribute('aria-labelledby','mapOverdueTitle');
mapOverdueDialog.setAttribute('aria-describedby','mapOverdueSummary');
mapOverdueDialog.innerHTML = '<header class="map-overdue-header"><div><span class="eyebrow">Station maintenance alerts</span><h2 id="mapOverdueTitle"></h2></div><button type="button" class="dialog-close" aria-label="Close overdue schedules" autofocus>×</button></header><p id="mapOverdueSummary"></p><div class="map-overdue-list"></div>';
document.body.append(mapOverdueDialog);
mapOverdueDialog.querySelector('.dialog-close').addEventListener('click',() => mapOverdueDialog.close());
mapOverdueDialog.addEventListener('click',event => {
  const button = event.target.closest('[data-map-schedule]');
  if (!button) return;
  mapOverdueDialog.close();
  openSchedule(button);
  editUnit(button.dataset.unit,Number(button.dataset.interval));
});
function renderMapOverdue(point,status) {
  const overdue = status.entries.filter(entry => entry.daysOverdue > 0);
  document.querySelector('#mapOverdueTitle').textContent = `${point.name} · Overdue schedules`;
  document.querySelector('#mapOverdueSummary').textContent = overdue.length
    ? `${overdue.length} overdue schedule${overdue.length === 1 ? '' : 's'} across ${new Set(overdue.map(entry => `${entry.group}|${entry.station}|${entry.equipment}|${entry.unit}`)).size} individual assets. Most overdue first. Select “Edit schedule” to update the exact asset and interval.`
    : 'All overdue schedules at this station have been cleared.';
  const markup = overdue.map(entry => `<article class="map-overdue-card ${entry.daysOverdue > 3 ? 'red' : 'yellow'}"><div class="map-overdue-card-heading"><div><span class="map-overdue-equipment">${escapeHtml(entry.equipment)}</span><h3>${escapeHtml(entry.label)}</h3></div><strong class="map-overdue-days">${entry.daysOverdue} day${entry.daysOverdue === 1 ? '' : 's'} overdue</strong></div><dl><div><dt>Schedule</dt><dd>${escapeHtml(scheduleIntervals[entry.interval])}</dd></div><div><dt>Next due</dt><dd>${formatScheduleDate(entry.record.nextDue)}</dd></div><div><dt>Last done</dt><dd>${formatScheduleDate(entry.record.lastDone)}</dd></div><div><dt>Station</dt><dd>${escapeHtml(entry.station)}</dd></div>${[['Rating',entry.rating],['Location',entry.record.location],['SSE',entry.record.sse],['JE',entry.record.je]].filter(([,value]) => value).map(([label,value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>${entry.record.notes ? `<p class="map-overdue-notes">${escapeHtml(entry.record.notes)}</p>` : ''}<button type="button" data-map-schedule data-group="${escapeHtml(entry.group)}" data-station="${escapeHtml(entry.station)}" data-equipment="${escapeHtml(entry.equipment)}" data-unit="${escapeHtml(entry.unit)}" data-interval="${entry.interval}">Edit schedule ↗</button></article>`).join('');
  const list = mapOverdueDialog.querySelector('.map-overdue-list');
  // Keep keyboard focus and scroll position during unchanged minute refreshes.
  if (list.innerHTML !== markup) list.innerHTML = markup;
}
const mapSelect = document.querySelector('#mapStationSelect');
let selectedMapStation = null, mapZoom = 1;
const mapMarkerButtons = new Map();
for (const point of stationMapPoints) {
  const marker = document.createElement('button');
  marker.type = 'button';
  marker.className = 'station-light green';
  marker.dataset.mapStation = point.id;
  marker.style.left = `${point.x}%`;
  marker.style.top = `${point.y}%`;
  marker.setAttribute('aria-pressed','false');
  marker.setAttribute('aria-describedby','mapMarkerTooltip');
  marker.addEventListener('mouseenter',() => showMapTooltip(marker));
  marker.addEventListener('focus',() => showMapTooltip(marker));
  marker.addEventListener('mouseleave',hideMapTooltip);
  marker.addEventListener('blur',hideMapTooltip);
  marker.addEventListener('click',() => { selectMapStation(point.id); hideMapTooltip(); });
  mapArtwork.append(marker);
  mapMarkerButtons.set(point.id,marker);
}
for (const point of [...stationMapPoints].sort((a,b) => a.name.localeCompare(b.name))) {
  const option = document.createElement('option');
  option.value = point.id;
  const duplicates = stationMapPoints.filter(item => item.name === point.name);
  option.textContent = point.name + (duplicates.length > 1 ? ` · map marker ${duplicates.indexOf(point)+1}` : '');
  mapSelect.append(option);
}
function renderMapDetail(point,status) {
  mapDetail.innerHTML = `<div class="map-detail-heading"><div><h3>${escapeHtml(point.name)}</h3><p><span class="map-status-word ${status.color}">${status.color.toUpperCase()}</span> ${escapeHtml(status.description)}</p></div><span>${status.entries.length} recorded schedule${status.entries.length === 1 ? '' : 's'}</span></div>${!status.linked ? '<p>This label on the supplied map is not linked to a station in the directory. No schedules recorded for this marker.</p>' : !status.entries.length ? '<p>No schedules recorded. Add individual assets and their schedules in the station directory.</p>' : `<div class="map-schedule-list">${status.entries.map(entry => `<button type="button" data-map-schedule data-group="${escapeHtml(entry.group)}" data-station="${escapeHtml(entry.station)}" data-equipment="${escapeHtml(entry.equipment)}" data-unit="${escapeHtml(entry.unit)}" data-interval="${entry.interval}"><span><strong>${escapeHtml(entry.label)}</strong> · ${escapeHtml(entry.equipment)}<small>${escapeHtml(scheduleIntervals[entry.interval])} · Next due: ${formatScheduleDate(entry.record.nextDue)}</small></span><b>${entry.daysOverdue ? `${entry.daysOverdue} days overdue` : entry.record.nextDue ? 'On schedule' : 'No due date'} ↗</b></button>`).join('')}</div>`}`;
}
function selectMapStation(id) {
  selectedMapStation = stationMapPoints.find(point => point.id === id) || null;
  mapSelect.value = selectedMapStation?.id || '';
  refreshStationMap();
  if (selectedMapStation) {
    navigateToStation(selectedMapStation);
  }
}
function refreshStationMap() {
  const totals = {green:0,yellow:0,red:0};
  for (const point of stationMapPoints) {
    const status = mapStationStatus(point), marker = mapMarkerButtons.get(point.id);
    totals[status.color]++;
    marker.className = `station-light ${status.color}`;
    marker.setAttribute('aria-pressed',String(selectedMapStation?.id === point.id));
    marker.setAttribute('aria-label',`${point.name}: ${status.color}, ${status.description}${status.linked ? '' : ', not linked to directory'}`);
    if (selectedMapStation?.id === point.id) {
      renderMapDetail(point,status);
      if (mapOverdueDialog.open) renderMapOverdue(point,status);
    }
  }
  for(const [color,total] of Object.entries(totals)) document.querySelector(`#map${color[0].toUpperCase()+color.slice(1)}Total`).textContent=String(total).padStart(2,'0');
}
function setMapZoom(value) {
  mapZoom = Math.max(1,Math.min(4,value));
  mapCanvas.style.width = `${mapZoom*100}%`;
  mapViewport.classList.toggle('is-zoomed',mapZoom > 1);
  document.querySelector('#mapZoomValue').textContent = `${Math.round(mapZoom*100)}%`;
  document.querySelector('#mapZoomOut').disabled = mapZoom === 1;
  document.querySelector('#mapZoomIn').disabled = mapZoom === 4;
}
document.querySelector('#mapZoomOut').addEventListener('click',() => setMapZoom(mapZoom-.5));
document.querySelector('#mapZoomIn').addEventListener('click',() => setMapZoom(mapZoom+.5));
document.querySelector('#mapZoomReset').addEventListener('click',() => { setMapZoom(1); mapViewport.scrollTo(0,0); });
mapSelect.addEventListener('change',() => {
  selectMapStation(mapSelect.value);
});
mapDetail.addEventListener('click',event => {
  const button = event.target.closest('[data-map-schedule]');
  if (!button) return;
  openSchedule(button);
  editUnit(button.dataset.unit,Number(button.dataset.interval));
});
document.addEventListener('schedules-updated',refreshStationMap);
document.addEventListener('visibilitychange',() => { if (!document.hidden) refreshStationMap(); });
window.addEventListener('storage',event => {
  if (!event.key || ['depotAssetUnits','depotSchedules','depotAssetCounts'].includes(event.key)) {
    for (const [key,store] of [['depotAssetUnits',assetUnitStore],['depotSchedules',scheduleStore],['depotAssetCounts',assetCountStore]]) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
        Object.keys(store).forEach(key => delete store[key]);
        Object.assign(store,data);
      } catch { /* Retain the last readable state. */ }
    }
    refreshStationMap();
  }
});
setMapZoom(1);
refreshStationMap();
