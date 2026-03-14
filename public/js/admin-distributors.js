// ── DATA ──
let distributors = [
  { id:1,  name:"John Doe",        email:"john@example.com",     phone:"+1 234 567 8901", sponsor:"Jane Smith",   status:"active",   date:"2026-03-02" },
  { id:2,  name:"Sarah Wilson",    email:"sarah@example.com",    phone:"+1 234 567 8902", sponsor:"Mike Johnson", status:"active",   date:"2026-03-01" },
  { id:3,  name:"David Brown",     email:"david@example.com",    phone:"+1 234 567 8903", sponsor:"Jane Smith",   status:"active",   date:"2026-02-28" },
  { id:4,  name:"Alice Cooper",    email:"alice@example.com",    phone:"+1 234 567 8904", sponsor:"John Doe",     status:"disabled", date:"2026-02-27" },
  { id:5,  name:"Bob Martin",      email:"bob@example.com",      phone:"+1 234 567 8905", sponsor:"Sarah Wilson", status:"active",   date:"2026-02-26" },
  { id:6,  name:"Grace Miller",    email:"grace@example.com",    phone:"+1 234 567 8906", sponsor:"David Brown",  status:"disabled", date:"2026-02-25" },
  { id:7,  name:"Henry Clark",     email:"henry@example.com",    phone:"+1 234 567 8907", sponsor:"Jane Smith",   status:"active",   date:"2026-02-24" },
  { id:8,  name:"Emma Garcia",     email:"emma@example.com",     phone:"+1 234 567 8908", sponsor:"Mike Johnson", status:"pending",  date:"2026-02-23" },
  { id:9,  name:"Olivia Martinez", email:"olivia@example.com",   phone:"+1 234 567 8909", sponsor:"John Doe",     status:"active",   date:"2026-02-22" },
  { id:10, name:"James Anderson",  email:"james@example.com",    phone:"+1 234 567 8910", sponsor:"Sarah Wilson", status:"inactive", date:"2026-02-21" },
  { id:11, name:"Sophia Lee",      email:"sophia@example.com",   phone:"+1 234 567 8911", sponsor:"David Brown",  status:"active",   date:"2026-02-20" },
  { id:12, name:"William Taylor",  email:"william@example.com",  phone:"+1 234 567 8912", sponsor:"Jane Smith",   status:"active",   date:"2026-02-19" },
];

let nextId = 13;
const PER_PAGE = 10;
let currentPage = 1;
let editingId = null;
let filtered = [];

// ── HELPERS ──
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function toast(msg, type='success'){
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon = type === 'success'
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  el.innerHTML = icon + esc(msg);
  wrap.appendChild(el);
  setTimeout(() => { el.style.animation = 'slideOut .3s both'; setTimeout(() => el.remove(), 300); }, 3000);
}

function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if(e.target === o) o.classList.remove('open'); });
});

function populateSponsorDropdown(){
  const sel = document.getElementById('f_sponsor');
  const cur = sel.value;
  sel.innerHTML = '<option value="">— None —</option>';
  distributors.forEach(d => {
    if(editingId && d.id === editingId) return;
    const opt = document.createElement('option');
    opt.value = d.name; opt.textContent = d.name;
    sel.appendChild(opt);
  });
  sel.value = cur;
}

function openAddModal(){
  editingId = null;
  document.getElementById('formModalTitle').textContent = 'Add Distributor';
  document.getElementById('formSaveBtn').textContent = 'Add Distributor';
  ['firstName','lastName','email','phone'].forEach(f => {
    document.getElementById('f_'+f).value = '';
    document.getElementById('e_'+f).textContent = '';
    document.getElementById('f_'+f).classList.remove('error');
  });
  document.getElementById('f_sponsor').value = '';
  document.getElementById('f_status').value = 'active';
  populateSponsorDropdown();
  openModal('formModal');
}

function openEditModal(id){
  const d = distributors.find(x => x.id === id);
  if(!d) return;
  editingId = id;
  document.getElementById('formModalTitle').textContent = 'Edit Distributor';
  document.getElementById('formSaveBtn').textContent = 'Save Changes';
  const [fn, ...ln] = d.name.split(' ');
  document.getElementById('f_firstName').value = fn || '';
  document.getElementById('f_lastName').value = ln.join(' ') || '';
  document.getElementById('f_email').value = d.email;
  document.getElementById('f_phone').value = d.phone;
  document.getElementById('f_status').value = d.status;
  ['firstName','lastName','email','phone'].forEach(f => {
    document.getElementById('e_'+f).textContent = '';
    document.getElementById('f_'+f).classList.remove('error');
  });
  populateSponsorDropdown();
  document.getElementById('f_sponsor').value = d.sponsor || '';
  openModal('formModal');
}

function saveDistributor(){
  const fn = document.getElementById('f_firstName').value.trim();
  const ln = document.getElementById('f_lastName').value.trim();
  const em = document.getElementById('f_email').value.trim();
  const ph = document.getElementById('f_phone').value.trim();
  let valid = true;

  const fields = { firstName: fn, lastName: ln, email: em, phone: ph };
  Object.entries(fields).forEach(([k,v]) => {
    const err = document.getElementById('e_'+k);
    const inp = document.getElementById('f_'+k);
    if(!v){ err.textContent = 'This field is required.'; inp.classList.add('error'); valid = false; }
    else if(k==='email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)){ err.textContent = 'Enter a valid email.'; inp.classList.add('error'); valid = false; }
    else { err.textContent = ''; inp.classList.remove('error'); }
  });
  if(!valid) return;

  const rec = {
    name: fn + ' ' + ln,
    email: em, phone: ph,
    sponsor: document.getElementById('f_sponsor').value,
    status: document.getElementById('f_status').value,
  };

  if(editingId){
    const idx = distributors.findIndex(x => x.id === editingId);
    distributors[idx] = { ...distributors[idx], ...rec };
    toast('Distributor updated successfully.');
  } else {
    distributors.unshift({ id: nextId++, date: new Date().toISOString().split('T')[0], ...rec });
    toast('Distributor added successfully.');
  }

  closeModal('formModal');
  applyFilters();
}

function openViewModal(id){
  window.location.href = 'distributor-profile.html?id=' + encodeURIComponent(id);
}

function confirmToggle(id){
  const d = distributors.find(x => x.id === id);
  if(!d) return;
  const disabling = d.status === 'active' || d.status === 'pending' || d.status === 'inactive';
  const icon = document.getElementById('confirmIcon');
  const svg  = document.getElementById('confirmIconSvg');
  if(disabling){
    icon.className = 'confirm-icon red';
    svg.innerHTML = '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>';
    document.getElementById('confirmTitle').textContent = 'Disable Distributor';
    document.getElementById('confirmMsg').textContent = `Are you sure you want to disable ${d.name}? They will lose access to the system.`;
    document.getElementById('confirmBtn').textContent = 'Disable';
    document.getElementById('confirmBtn').className = 'btn-save btn-danger';
  } else {
    icon.className = 'confirm-icon green';
    svg.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
    document.getElementById('confirmTitle').textContent = 'Enable Distributor';
    document.getElementById('confirmMsg').textContent = `Re-enable ${d.name} and restore their access?`;
    document.getElementById('confirmBtn').textContent = 'Enable';
    document.getElementById('confirmBtn').className = 'btn-save btn-success';
  }
  document.getElementById('confirmBtn').onclick = () => toggleStatus(id, disabling);
  openModal('confirmModal');
}

function toggleStatus(id, disabling){
  const idx = distributors.findIndex(x => x.id === id);
  distributors[idx].status = disabling ? 'disabled' : 'active';
  closeModal('confirmModal');
  toast(disabling ? 'Distributor disabled.' : 'Distributor enabled.');
  applyFilters();
}

function cap(s){ return s ? s[0].toUpperCase()+s.slice(1) : ''; }

function applyFilters(){
  const q  = document.getElementById('searchInput').value.toLowerCase().trim();
  const st = document.getElementById('statusFilter').value;
  const sv = document.getElementById('sortSelect').value;

  filtered = distributors.filter(d => {
    const mq = !q || [d.name, d.email, d.phone].some(v => v.toLowerCase().includes(q));
    const ms = !st || d.status === st;
    return mq && ms;
  });

  const [col, dir] = sv.split('-');
  filtered.sort((a,b) => {
    let va = col === 'date' ? a.date : a.name.toLowerCase();
    let vb = col === 'date' ? b.date : b.name.toLowerCase();
    if(va < vb) return dir==='asc' ? -1 : 1;
    if(va > vb) return dir==='asc' ? 1 : -1;
    return 0;
  });

  currentPage = 1;
  render();
}

function render(){
  const tbody = document.getElementById('tableBody');
  const start = (currentPage-1)*PER_PAGE;
  const page  = filtered.slice(start, start+PER_PAGE);

  document.getElementById('showingCount').textContent =
    `Showing ${filtered.length} distributor${filtered.length!==1?'s':''}`;

  if(!page.length){
    tbody.innerHTML = `<tr><td colspan="6"><div class="no-results">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      No distributors match your search.</div></td></tr>`;
  } else {
    const svgEye      = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    const svgEdit     = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    const svgEnable   = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    const svgDisable  = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>';

    tbody.innerHTML = page.map(function(d, i) {
      var isDisabled   = d.status === 'disabled';
      var toggleClass  = isDisabled ? 'enable' : 'disable';
      var toggleTitle  = isDisabled ? 'Enable' : 'Disable';
      var toggleSvg    = isDisabled ? svgEnable : svgDisable;
      var delay        = i * 25;
      return '<tr style="animation-delay:' + delay + 'ms">'
        + '<td>' + esc(d.name) + '</td>'
        + '<td>' + esc(d.email) + '</td>'
        + '<td>' + esc(d.phone) + '</td>'
        + '<td>' + esc(d.sponsor || '\u2014') + '</td>'
        + '<td><span class="badge ' + d.status + '">' + cap(d.status) + '</span></td>'
        + '<td><div class="actions">'
          + '<button class="action-btn view" onclick="openViewModal(' + d.id + ')" title="View">' + svgEye + '</button>'
          + '<button class="action-btn edit" onclick="openEditModal(' + d.id + ')" title="Edit">' + svgEdit + '</button>'
          + '<button class="action-btn ' + toggleClass + '" onclick="confirmToggle(' + d.id + ')" title="' + toggleTitle + '">' + toggleSvg + '</button>'
        + '</div></td>'
        + '</tr>';
    }).join('');
  }

  renderPagination();
}

function renderPagination(){
  const total = filtered.length;
  const pages = Math.ceil(total/PER_PAGE);
  const pg = document.getElementById('pagination');
  if(pages <= 1){ pg.innerHTML=''; return; }

  const s = (currentPage-1)*PER_PAGE+1;
  const e = Math.min(currentPage*PER_PAGE, total);

  let btns = `<button class="page-btn" onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
  </button>`;
  for(let p=1; p<=pages; p++){
    if(pages>7 && p>2 && p<pages-1 && Math.abs(p-currentPage)>1){
      if(p===3||p===pages-2) btns+=`<button class="page-btn" disabled>…</button>`;
      continue;
    }
    btns+=`<button class="page-btn ${p===currentPage?'active':''}" onclick="goPage(${p})">${p}</button>`;
  }
  btns+=`<button class="page-btn" onclick="goPage(${currentPage+1})" ${currentPage===pages?'disabled':''}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
  </button>`;

  pg.innerHTML = `<span class="page-info">Showing ${s}–${e} of ${total}</span><div class="page-btns">${btns}</div>`;
}

function goPage(p){
  const pages = Math.ceil(filtered.length/PER_PAGE);
  if(p<1||p>pages) return;
  currentPage = p;
  render();
}

// Column header sort
document.querySelectorAll('thead th[data-col]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    const dir = th.classList.contains('sort-asc') ? 'desc' : 'asc';
    document.querySelectorAll('thead th').forEach(t => t.classList.remove('sort-asc','sort-desc'));
    th.classList.add(dir==='asc'?'sort-asc':'sort-desc');
    if(col==='name') document.getElementById('sortSelect').value = 'name-'+dir;
    if(col==='date') document.getElementById('sortSelect').value = 'date-'+dir;
    applyFilters();
  });
});

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);
document.getElementById('sortSelect').addEventListener('change', applyFilters);

applyFilters();
