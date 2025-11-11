// frontend/js/db.js
// CRUD simple usando localStorage. Llave: 'hr_db_v1'
const LS_KEY = 'hr_db_v1';

function loadDB(){
  const raw = localStorage.getItem(LS_KEY);
  if(!raw) {
    const init = { users: [], requests: [], hardwares: [], reports: [] };
    localStorage.setItem(LS_KEY, JSON.stringify(init));
    return init;
  }
  try { return JSON.parse(raw); } catch(e) { const init = { users: [], requests: [], hardwares: [], reports: [] }; localStorage.setItem(LS_KEY, JSON.stringify(init)); return init; }
}

function saveDB(db){ localStorage.setItem(LS_KEY, JSON.stringify(db)); }

function uid(collection){
  if(!collection.length) return 1;
  return Math.max(...collection.map(x=>x.id)) + 1;
}

// ----- Users -----
function createUser(nombre, email){
  const db = loadDB();
  const id = uid(db.users);
  const u = { id, nombre, email, telefono: '', rol: 'ciudadano', created_at: new Date().toISOString() };
  db.users.push(u);
  saveDB(db);
  return u;
}
function listUsers(){ return loadDB().users.slice().sort((a,b)=>a.id-b.id); }

// ----- Requests -----
function createRequest(user_id, direccion){
  const db = loadDB();
  const id = uid(db.requests);
  const r = { id, user_id, direccion, lat: null, lon: null, estado: 'pendiente', observaciones: '', created_at: new Date().toISOString() };
  db.requests.push(r);
  saveDB(db);
  return r;
}
function listRequestsByUser(userId){ const db=loadDB(); return db.requests.filter(r=>r.user_id===userId).map(r=>Object.assign({}, r, { items_count: db.hardwares.filter(h=>h.request_id===r.id).length })); }
function listAllRequests(){ const db=loadDB(); return db.requests.map(r=>Object.assign({}, r, { items_count: db.hardwares.filter(h=>h.request_id===r.id).length })); }

// ----- Hardwares -----
function addHardware(request_id, tipo, marca, modelo, estado='no_funcional'){
  const db=loadDB();
  const id = uid(db.hardwares);
  const h = { id, request_id, tipo, marca, modelo, estado, peso_kg: null, reciclable: false, created_at: new Date().toISOString() };
  db.hardwares.push(h);
  saveDB(db);
  return h;
}
function listHardwaresByRequest(requestId){ return loadDB().hardwares.filter(h=>h.request_id==requestId); }

// ----- Reports -----
function generateReport(generado_por=null){
  const db = loadDB();
  const total_requests = db.requests.length;
  const stats = db.hardwares.reduce((acc,h)=>{ acc[h.estado] = (acc[h.estado]||0)+1; return acc; }, {});
  const payload = { hardwares_por_estado: stats, total_requests };
  const id = uid(db.reports);
  const rep = { id, tipo: 'ad_hoc', contenido: payload, generado_por, fecha_generado: new Date().toISOString() };
  db.reports.push(rep);
  saveDB(db);
  return rep;
}
function listReports(){ return loadDB().reports.slice().sort((a,b)=>b.id-a.id); }
function getReport(id){ return loadDB().reports.find(r=>r.id==id) || null; }

// ----- Reset DB (danger) -----
function resetDB(){
  const init = { users: [], requests: [], hardwares: [], reports: [] };
  localStorage.setItem(LS_KEY, JSON.stringify(init));
}

// ----- UI wiring -----
document.addEventListener('DOMContentLoaded', ()=> {
  // Nav
  document.querySelectorAll('.nav-btn').forEach(b=>{
    b.addEventListener('click', ()=> {
      document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      const view = b.dataset.view;
      document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
      const el = document.getElementById('view-' + view);
      if(el) el.classList.remove('hidden');

      // load view data
      if(view === 'users') renderUsers();
      if(view === 'requests') renderRequests();
      if(view === 'hardwares') { /* nothing */ }
      if(view === 'reports') renderReports();
    });
  });

  // Users create
  document.getElementById('form-create-user').addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const nombre = fd.get('nombre').trim();
    const email = fd.get('email').trim();
    if(!nombre || !email){ alert('Nombre y email son requeridos'); return; }
    createUser(nombre, email);
    ev.target.reset();
    renderUsers();
    alert('Usuario creado localmente');
  });

  // Requests view controls
  document.getElementById('btn-create-request').addEventListener('click', ()=>{
    const uidInput = document.getElementById('req-user-id').value;
    const uidVal = parseInt(uidInput,10);
    if(!uidVal){ alert('Ingresa id de usuario en el campo'); return; }
    const direccion = prompt('Dirección de la solicitud:');
    if(!direccion) return;
    createRequest(uidVal, direccion);
    renderRequests();
    alert('Solicitud creada');
  });

  // Hardwares show/add
  document.getElementById('btn-show-hw').addEventListener('click', ()=>{
    const rid = parseInt(document.getElementById('hw-request-id').value,10);
    if(!rid){ alert('Ingresa id de solicitud'); return; }
    showHardwaresUI(rid);
  });

  // Reports
  document.getElementById('btn-gen-report').addEventListener('click', ()=>{
    const by = prompt('ID del usuario que genera el reporte (opcional):');
    const genBy = by ? parseInt(by,10):null;
    const r = generateReport(genBy);
    renderReports();
    alert('Reporte generado id=' + r.id);
  });

  // Reset
  document.getElementById('btn-reset').addEventListener('click', ()=>{
    if(confirm('Borrar todos los datos locales? Esto no se puede deshacer.')) {
      resetDB();
      // refresh views
      renderUsers(); renderRequests(); renderReports();
      document.getElementById('hardwares-root').innerHTML = '';
      alert('Datos borrados');
    }
  });

  // initial render
  renderUsers();
  renderRequests();
  renderReports();
});

// Render helpers
function renderUsers(){
  const root = document.getElementById('users-list');
  const users = listUsers();
  if(users.length === 0){ root.innerHTML = '<div class="muted">No hay usuarios</div>'; return; }
  const table = document.createElement('table'); table.className = 'table';
  const thead = document.createElement('thead'); thead.innerHTML = '<tr><th>ID</th><th>Nombre</th><th>Email</th></tr>'; table.appendChild(thead);
  const tbody = document.createElement('tbody');
  users.forEach(u=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${u.id}</td><td>${u.nombre}</td><td>${u.email}</td>`;
    tr.addEventListener('click', ()=> {
      document.querySelector('[data-view="requests"]').click();
      document.getElementById('req-user-id').value = u.id;
      renderRequests();
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  root.innerHTML = ''; root.appendChild(table);
}

function renderRequests(){
  const root = document.getElementById('requests-list');
  const filter = parseInt(document.getElementById('req-user-id').value,10) || null;
  const list = filter ? listRequestsByUser(filter) : listAllRequests();
  if(list.length === 0){ root.innerHTML = '<div class="muted">No hay solicitudes</div>'; return; }
  const table = document.createElement('table'); table.className = 'table';
  table.innerHTML = '<thead><tr><th>ID</th><th>UserID</th><th>Dirección</th><th>Estado</th><th>Items</th></tr></thead>';
  const tbody = document.createElement('tbody');
  list.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.id}</td><td>${r.user_id}</td><td>${r.direccion}</td><td>${r.estado}</td><td>${r.items_count||0}</td>`;
    tr.addEventListener('click', ()=> {
      document.querySelector('[data-view="hardwares"]').click();
      document.getElementById('hw-request-id').value = r.id;
      showHardwaresUI(r.id);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  root.innerHTML = ''; root.appendChild(table);
}

function showHardwaresUI(requestId){
  const root = document.getElementById('hardwares-root');
  root.innerHTML = '';
  const box = document.createElement('div'); box.className = 'card-mini';
  box.innerHTML = `<strong>Solicitud ${requestId}</strong>
    <form id="form-add-hw" style="margin-top:8px">
      <input name="tipo" placeholder="Tipo (ej. disco duro)" required />
      <input name="marca" placeholder="Marca" />
      <input name="modelo" placeholder="Modelo" />
      <select name="estado">
        <option value="no_funcional">no_funcional</option>
        <option value="reutilizable">reutilizable</option>
        <option value="funcional">funcional</option>
      </select>
      <div style="margin-top:8px"><button type="submit">Agregar hardware</button></div>
    </form>
    <div id="hw-list" style="margin-top:8px"></div>`;
  root.appendChild(box);

  const form = box.querySelector('#form-add-hw');
  form.addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const fd = new FormData(form);
    const tipo = fd.get('tipo').trim();
    const marca = fd.get('marca').trim()||null;
    const modelo = fd.get('modelo').trim()||null;
    const estado = fd.get('estado')||'no_funcional';
    addHardware(requestId, tipo, marca, modelo, estado);
    form.reset();
    renderRequests(); // update items_count
    showHardwareList(requestId, box.querySelector('#hw-list'));
  });

  showHardwareList(requestId, box.querySelector('#hw-list'));
}

function showHardwareList(requestId, container){
  const hw = listHardwaresByRequest(requestId);
  if(!hw.length){ container.innerHTML = '<div class="muted">No hay hardwares</div>'; return; }
  const table = document.createElement('table'); table.className = 'table';
  table.innerHTML = '<thead><tr><th>ID</th><th>Tipo</th><th>Marca</th><th>Modelo</th><th>Estado</th></tr></thead>';
  const tbody = document.createElement('tbody');
  hw.forEach(h=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${h.id}</td><td>${h.tipo}</td><td>${h.marca||''}</td><td>${h.modelo||''}</td><td>${h.estado}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.innerHTML = ''; container.appendChild(table);
}

function renderReports(){
  const root = document.getElementById('reports-list');
  const list = listReports();
  if(!list.length){ root.innerHTML = '<div class="muted">No hay reportes</div>'; return; }
  const table = document.createElement('table'); table.className = 'table';
  table.innerHTML = '<thead><tr><th>ID</th><th>Tipo</th><th>Fecha</th></tr></thead>';
  const tbody = document.createElement('tbody');
  list.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.id}</td><td>${r.tipo}</td><td>${new Date(r.fecha_generado).toLocaleString()}</td>`;
    tr.addEventListener('click', ()=> alert(JSON.stringify(r.contenido, null, 2)));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  root.innerHTML = ''; root.appendChild(table);
}
