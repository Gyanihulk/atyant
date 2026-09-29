// Station navigation and the five-day notification timeline share saved schedules.
const stationWorkspace = document.createElement('section');
stationWorkspace.id = 'stationWorkspace';
stationWorkspace.className = 'section-wrap station-workspace';
stationWorkspace.hidden = true;
stationWorkspace.setAttribute('aria-labelledby','stationWorkspaceTitle');
document.querySelector('#directory').before(stationWorkspace);
let workspaceStation = null;

function linkedStationRows(point) {
  return groups.flatMap(group => group.stations.filter(([name,code]) => point.codes.includes(code) || (point.code === 'NGRT' && !code && name === 'Nagrota')).map(([name,code]) => ({group:group.code,depot:group.name,name,code})));
}
function equipmentStatus(group,station,equipment,today = localCalendarDate()) {
  const units = unitsForKey(`${group}|${station}|${equipment}`);
  const day = calendarDayNumber(today);
  let daysOverdue = 0, overdueCount = 0, savedCount = 0;
  for (const unit of units) for (const schedule of unit.schedules || []) {
    const record = normalizeSchedule(schedule);
    if (scheduleHasData(record)) savedCount++;
    const due = calendarDayNumber(record.nextDue);
    if (due !== null && due < day) { overdueCount++; daysOverdue = Math.max(daysOverdue,day-due); }
  }
  return {units:units.length,savedCount,overdueCount,daysOverdue,color:daysOverdue>3?'red':daysOverdue>0?'yellow':'green'};
}
function navigateToStation(point) {
  workspaceStation = point;
  stationWorkspace.hidden = false;
  renderStationWorkspace();
  stationWorkspace.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  document.querySelector('#stationWorkspaceTitle').focus({preventScroll:true});
}
function renderStationWorkspace() {
  if (!workspaceStation) return;
  const point = workspaceStation, rows = linkedStationRows(point), status = mapStationStatus(point);
  const focused = document.activeElement?.closest('#stationWorkspace [data-equipment]');
  const focusKey = focused ? [focused.dataset.group,focused.dataset.station,focused.dataset.equipment].join('|') : null;
  stationWorkspace.innerHTML = `<div class="station-workspace-heading"><div><div class="eyebrow">Station equipment workspace</div><h2 id="stationWorkspaceTitle" tabindex="-1">${escapeHtml(point.name)} <small>${escapeHtml(point.code)}</small></h2><p>Select an equipment column to view its individual units and maintenance schedules.</p></div><a class="station-back-map" href="#map">← Back to map</a></div><div class="station-workspace-summary"><span class="map-status-word ${status.color}">${status.color.toUpperCase()}</span><span>${escapeHtml(status.description)}</span>${status.daysOverdue ? '<button class="station-overdue-button" type="button">View overdue details ↗</button>' : ''}</div>${rows.length ? rows.map(row => `<section class="station-depot-assets"><h3>${escapeHtml(row.depot)} · ${escapeHtml(row.name)}</h3><div class="station-equipment-grid">${subcolumns.map(equipment => {
    const state = equipmentStatus(row.group,row.name,equipment);
    return `<button type="button" class="station-equipment-card ${state.color}${state.daysOverdue?' equipment-overdue':''}" data-group="${escapeHtml(row.group)}" data-station="${escapeHtml(row.name)}" data-equipment="${escapeHtml(equipment)}"><span class="equipment-card-name"><i></i>${escapeHtml(equipment)}</span><strong>${state.units} unit${state.units===1?'':'s'}</strong><span>${state.savedCount} recorded schedules</span><b>${state.daysOverdue ? `${state.overdueCount} overdue · up to ${state.daysOverdue} days` : state.savedCount ? 'No overdue schedules' : 'No schedules recorded'}</b><small>Open assets & schedules ↗</small></button>`;
  }).join('')}</div></section>`).join('') : `<p class="station-unassigned">This station is on the supplied map, but its depot assignment has not been confirmed. Equipment categories are shown below; editing becomes available once the station is assigned.</p><div class="station-equipment-grid">${subcolumns.map(equipment => `<div class="station-equipment-card unassigned"><span class="equipment-card-name">${escapeHtml(equipment)}</span><b>Depot assignment pending</b></div>`).join('')}</div>`}`;
  if (focusKey) [...stationWorkspace.querySelectorAll('[data-equipment]')].find(button => [button.dataset.group,button.dataset.station,button.dataset.equipment].join('|')===focusKey)?.focus({preventScroll:true});
}
stationWorkspace.addEventListener('click',event => {
  const equipment = event.target.closest('button[data-equipment]');
  if (equipment) openSchedule(equipment);
  if (event.target.closest('.station-overdue-button')) {
    renderMapOverdue(workspaceStation,mapStationStatus(workspaceStation));
    mapOverdueDialog.showModal();
  }
});

const upcomingPanel = document.createElement('section');
upcomingPanel.id = 'upcomingNotifications';
upcomingPanel.className = 'section-wrap upcoming-notifications';
upcomingPanel.setAttribute('aria-labelledby','upcomingTitle');
upcomingPanel.innerHTML = '<div class="section-heading"><div><div class="eyebrow">Maintenance notifications</div><h2 id="upcomingTitle">Next 5 days<br><em>schedule timeline.</em></h2></div><p>Due today through five days ahead, in date order. Select a reminder to edit that asset’s schedule.</p></div><p id="upcomingSummary" class="upcoming-summary" role="status"></p><div id="upcomingTimeline" class="upcoming-timeline"></div>';
document.querySelector('#scheduleTracker').before(upcomingPanel);
const upcomingNav = document.createElement('a');
upcomingNav.href = '#upcomingNotifications';
upcomingNav.textContent = 'Upcoming alerts';
document.querySelector('.main-nav a[href="#scheduleTracker"]').before(upcomingNav);

function upcomingEntries(today = localCalendarDate()) {
  const day = calendarDayNumber(today), entries=[];
  for (const group of groups) for (const [station] of group.stations) for (const equipment of subcolumns) {
    for (const unit of unitsForKey(`${group.code}|${station}|${equipment}`)) (unit.schedules || []).forEach((value,interval) => {
      const record = normalizeSchedule(value), due = calendarDayNumber(record.nextDue);
      if (due !== null && due >= day && due <= day+5) entries.push({group:group.code,depot:group.name,station,equipment,unit:unit.id,label:unit.label,interval,record,daysUntil:due-day});
    });
  }
  return entries.sort((a,b) => a.daysUntil-b.daysUntil || a.station.localeCompare(b.station) || a.equipment.localeCompare(b.equipment) || a.label.localeCompare(b.label));
}
function renderUpcomingNotifications() {
  const entries = upcomingEntries(), timeline=document.querySelector('#upcomingTimeline');
  document.querySelector('#upcomingSummary').textContent = `${entries.length} schedule${entries.length===1?'':'s'} due from today through the next five days. Updates automatically.`;
  const dates = [...new Set(entries.map(entry => entry.record.nextDue))];
  const html = dates.length ? dates.map(date => {
    const items=entries.filter(entry => entry.record.nextDue===date), days=items[0].daysUntil;
    return `<section class="upcoming-day"><header><span>${days===0?'Today':days===1?'Tomorrow':`In ${days} days`}</span><h3>${formatScheduleDate(date)}</h3></header><div class="upcoming-day-items">${items.map(entry => `<button class="upcoming-entry" type="button" data-group="${escapeHtml(entry.group)}" data-station="${escapeHtml(entry.station)}" data-equipment="${escapeHtml(entry.equipment)}" data-unit="${escapeHtml(entry.unit)}" data-interval="${entry.interval}"><span class="upcoming-station">${escapeHtml(entry.station)} <small>${escapeHtml(entry.depot)}</small></span><strong>${escapeHtml(entry.equipment)} · ${escapeHtml(entry.label)}</strong><span>${escapeHtml(scheduleIntervals[entry.interval])}</span>${entry.record.location?`<span>Location: ${escapeHtml(entry.record.location)}</span>`:''}<b>${days===0?'Due today':'Upcoming'} · Edit schedule ↗</b></button>`).join('')}</div></section>`;
  }).join('') : '<p class="upcoming-empty">No schedules are due in the next five days.</p>';
  if (timeline.innerHTML!==html) timeline.innerHTML=html;
}
upcomingPanel.addEventListener('click',event => {
  const entry=event.target.closest('.upcoming-entry');
  if (entry) {openSchedule(entry);editUnit(entry.dataset.unit,Number(entry.dataset.interval));}
});
function highlightEquipmentColumns() {
  for (const button of grid.querySelectorAll('.schedule-cell-button')) {
    const state=equipmentStatus(button.dataset.group,button.dataset.station,button.dataset.equipment);
    button.classList.toggle('equipment-overdue',state.daysOverdue>0);
    button.classList.toggle('yellow',state.color==='yellow');
    button.classList.toggle('red',state.color==='red');
    let label=button.querySelector('.equipment-overdue-label');
    if (state.daysOverdue) {
      if (!label) {label=document.createElement('span');label.className='equipment-overdue-label';button.append(label);}
      label.textContent=`${state.daysOverdue} days overdue`;
    } else label?.remove();
  }
}
function refreshInventoryAlerts() {
  if (!activeSchedule) return;
  const units = unitsForKey(scheduleKey()), today = calendarDayNumber(localCalendarDate());
  const overdueDays = value => {
    const due = calendarDayNumber(normalizeSchedule(value).nextDue);
    return due === null ? 0 : Math.max(0,today-due);
  };
  const highlight = (element,days) => {
    element.classList.toggle('inventory-overdue',days>0);
    element.classList.toggle('yellow',days>0 && days<=3);
    element.classList.toggle('red',days>3);
  };
  for (const card of assetUnitList.querySelectorAll('[data-asset-unit]')) {
    const unit = units.find(item => item.id === card.dataset.assetUnit);
    if (!unit) continue;
    const schedules = unit.schedules || [], days = Math.max(0,...schedules.map(overdueDays));
    highlight(card,days);
    let badge = card.querySelector('.inventory-overdue-summary');
    if (days) {
      if (!badge) {badge=document.createElement('p');badge.className='inventory-overdue-summary';card.querySelector('.asset-unit-row').after(badge);}
      const count = schedules.filter(value => overdueDays(value)>0).length;
      badge.textContent = `${count} overdue schedule${count===1?'':'s'} · ${days} day${days===1?'':'s'} overdue · ${days>3?'Red':'Yellow'}`;
    } else badge?.remove();
    for (const entry of card.querySelectorAll('.unit-timeline-entry')) {
      const record = normalizeSchedule(schedules[Number(entry.dataset.editInterval)]);
      const intervalDays = overdueDays(record);
      highlight(entry,intervalDays);
      entry.classList.toggle('overdue',intervalDays>0);
      entry.querySelector('.timeline-status').textContent = intervalDays ? `${intervalDays} day${intervalDays===1?'':'s'} overdue` : record.nextDue ? dueStatus(record.nextDue) : record.lastDone ? 'Completed' : 'No due date';
    }
  }
}
function refreshStationNotifications() {renderStationWorkspace();renderUpcomingNotifications();highlightEquipmentColumns();refreshInventoryAlerts();}
document.addEventListener('schedules-updated',refreshStationNotifications);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshStationNotifications()});
window.addEventListener('storage',refreshStationNotifications);
refreshStationNotifications();
