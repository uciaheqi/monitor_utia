// =============== CONFIGURACIÓN ===============

const CONFIG = {
  MODE: "api",   // <<--- así se muestra #registro_form_api
  GOOGLE_FORM_EMBED_URL: "",
  API_BASE: "",
  AUTH_TOKEN: "",
  DATA_BASE: "./data",
  DATA_FILE: "data.json",
  BUILD_FILE: "build.json"
};


// =============== UTILIDADES UI ===============
const diag = t => { const el = document.getElementById('diag'); if (el) el.textContent = 'estado: ' + t; };
const notify = (msg, type="info") => {
  const n = document.getElementById('notification');
  n.textContent = msg; n.className = "notification show " + type;
  setTimeout(() => n.classList.remove("show"), 2800);
};
const fmtInt = x => Number.isFinite(x) ? x.toLocaleString() : "—";
const fmtPct = x => Number.isFinite(x) ? (100 * x).toFixed(1) + "%" : "—";
const fmtNum = x => Number.isFinite(x) ? x.toFixed(1) : "—";
const parseNum = v => { const n = Number(String(v).replace(",", ".")); return Number.isFinite(n) ? n : NaN; };
const smartDate = s => {
  if (!s && s !== 0) return null;
  if (s instanceof Date && !isNaN(+s)) return s;
  if (typeof s === "number" && Number.isFinite(s)) return new Date(s);
  const d = new Date(String(s)); return isNaN(+d) ? null : d;
};
const dateInput = d => d ? new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10) : "";

// =============== ESTADO ===============
let RAW = [], DATA = [];
let TABLE = null;

// =============== CARGA DE DATOS (LECTURA) ===============
async function getJSON(path){
  const v = new Date().toISOString().slice(0,10); // bust de caché diario
  const url = `${path}${path.includes("?") ? "&" : "?"}v=${v}`;
  const r = await fetch(url, { cache: "no-store" });
  if(!r.ok) throw new Error(`GET ${path}: ${r.status}`);
  return r.json();
}

async function loadStaticData(){
  diag("cargando datos…");
  const base = CONFIG.DATA_BASE.replace(/\/+$/,"");
  const data = await getJSON(`${base}/${CONFIG.DATA_FILE}`);
  RAW = Array.isArray(data) ? data.map(r => {
    const fi = smartDate(r["fecha_de_ingreso"]);
    const fe = smartDate(r["fecha_de_egreso"]);
    const ap = parseNum(r["apache_ii_a_las_24_h_del_ingreso"]);
    const so = parseNum(r["sofa_a_las_48_h_del_ingreso"]);
    const edad = parseNum(r["edad"]);
    const los = Number.isFinite(parseNum(r["dias_de_internacion"])) ? parseNum(r["dias_de_internacion"])
              : (fi && fe ? Math.max(0, Math.round((+fe - +fi)/86400000)) : NaN);
    const died = /Óbito|Obito|óbito|obito|fallec|muerte/i.test(r["condicion_al_egreso"] || "");
    return { ...r, _fi:fi, _fe:fe, _ap:ap, _so:so, _edad:edad, _los: Number.isFinite(los) ? los : NaN, _died: !!died };
  }).filter(d => d._fi) : [];
  try{
    const build = await getJSON(`${base}/${CONFIG.BUILD_FILE}`);
    document.getElementById("lastBuild").textContent = `${build.built_at || "—"} · N=${fmtInt(build.rows||RAW.length)}`;
  }catch(_){ document.getElementById("lastBuild").textContent = `N=${fmtInt(RAW.length)}`; }
  applyFilters(true);
  diag(`cargado · registros: ${RAW.length}, con fecha: ${RAW.filter(d=>d._fi).length}`);
}

// =============== FILTROS ===============
function initDateBounds(){
  if(!RAW.length){ document.getElementById("fDesde").value=""; document.getElementById("fHasta").value=""; return; }
  const minD = new Date(Math.min(...RAW.map(d => +d._fi)));
  const maxD = new Date(Math.max(...RAW.map(d => +d._fi)));
  document.getElementById("fDesde").value = dateInput(minD);
  document.getElementById("fHasta").value = dateInput(maxD);
}
function applyFilters(first=false){
  const d1 = new Date((document.getElementById("fDesde").value || "1970-01-01")+"T00:00:00");
  const d2 = new Date((document.getElementById("fHasta").value || "2999-12-31")+"T23:59:59");
  DATA = RAW.filter(r => r._fi >= d1 && r._fi <= d2);
  if(first) initDateBounds();
  drawAll();
}

// =============== KPIs & TABLA ===============
function updateKPIs(){
  const n = DATA.length;
  const ob = DATA.filter(d=>d._died).length;
  const prev = n ? ob/n : 0;
  const mean = arr => { const v = arr.filter(Number.isFinite); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : NaN; };
  const los = mean(DATA.map(d=>d._los));
  const ap  = mean(DATA.map(d=>d._ap));
  const so  = mean(DATA.map(d=>d._so));
  const viP = n ? DATA.filter(d => /^si|sí|s|true|1$/i.test(String(d["ventilacion_invasiva"]||""))).length / n : 0;
  document.getElementById("kpiTotal").textContent = fmtInt(n);
  document.getElementById("kpiObitos").textContent = fmtInt(ob);
  document.getElementById("kpiPrev").textContent   = fmtPct(prev);
  document.getElementById("kpiLOS").textContent    = fmtNum(los);
  document.getElementById("kpiApache").textContent = fmtNum(ap);
  document.getElementById("kpiSofa").textContent   = fmtNum(so);
  document.getElementById("kpiVI").textContent     = fmtPct(viP);
}

function drawTable(){
  if(TABLE) TABLE.destroy();
  const fmt = d => d ? dateInput(d) : "";
  const cols = [
    { title:"Ingreso", data:"_fi", render: d => fmt(d) },
    { title:"Egreso", data:"_fe", render: d => fmt(d) },
    { title:"Edad", data:"_edad", render: d => Number.isFinite(d) ? d : "" },
    { title:"APACHE", data:"_ap", render: d => Number.isFinite(d) ? d : "" },
    { title:"SOFA", data:"_so", render: d => Number.isFinite(d) ? d : "" },
    { title:"LOS", data:"_los", render: d => Number.isFinite(d) ? d : "" },
    { title:"Cond. egreso", data:"condicion_al_egreso" },
    { title:"Origen", data:"origen_del_paciente" },
    { title:"Tipo", data:"tipos_de_pacientes" },
    { title:"Médico", data:"medico_tratante" }
  ];
  TABLE = $('#tbl').DataTable({
    data: DATA,
    columns: cols,
    pageLength: 25,
    responsive: true,
    language: { url: 'https://cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json' },
    dom: 'Bfrtip',
    buttons: [
      { extend: 'csvHtml5', text: 'CSV', filename: ()=>'uci_analytics_'+new Date().toISOString().slice(0,10) },
      { extend: 'excelHtml5', text: 'Excel', filename: ()=>'uci_analytics_'+new Date().toISOString().slice(0,10) }
    ]
  });
}

// =============== GRÁFICOS (Google Charts) ===============
google.charts.load('current', { packages: ['corechart','timeline','scatter','bar'] });
const whenCharts = fn => { if (google?.visualization?.DataTable) fn(); else google.charts.setOnLoadCallback(fn); };

function drawAdmissions(){
  whenCharts(()=>{
    const el = document.getElementById("chartAdmisiones");
    if(!DATA.length){ el.innerHTML='<div class="text-muted">Sin datos</div>'; document.getElementById('capAdmisiones').textContent='Periodo: —'; return; }
    const byM = new Map();
    DATA.forEach(d => { const k = Date.UTC(d._fi.getUTCFullYear(), d._fi.getUTCMonth(), 1); byM.set(k, (byM.get(k)||0)+1); });
    const rows = [...byM.entries()].sort((a,b)=>a[0]-b[0]).map(([k,v]) => [new Date(Number(k)), v]);
    const dt = new google.visualization.DataTable(); dt.addColumn('date','Mes'); dt.addColumn('number','Admisiones'); dt.addRows(rows);
    const type = document.querySelector('.chart-type[data-chart="admisiones"].active')?.dataset?.type || "area";
    const chart = type==="bar" ? new google.visualization.ColumnChart(el)
                 : type==="line"? new google.visualization.LineChart(el)
                 : new google.visualization.AreaChart(el);
    chart.draw(dt, { legend:'none', height:320, areaOpacity:.18, colors:['#3b82f6'], hAxis:{format:'MMM yyyy'}, vAxis:{minValue:0}, chartArea:{left:60, top:20, width:'85%', height:'70%'} });
    const r0 = rows[0]?.[0], r1 = rows.at(-1)?.[0];
    document.getElementById('capAdmisiones').textContent = `Periodo: ${r0? r0.toISOString().slice(0,7):'—'} a ${r1? r1.toISOString().slice(0,7):'—'} · N=${fmtInt(DATA.length)}`;
  });
}
function drawAges(){
  whenCharts(()=>{
    const ages = DATA.map(d=>d._edad).filter(Number.isFinite);
    const el = document.getElementById("chartEdades");
    if(!ages.length){ el.innerHTML='<div class="text-muted">Sin edades</div>'; return; }
    const bins = {'<30':0,'30-39':0,'40-49':0,'50-59':0,'60-69':0,'70-79':0,'80-89':0,'90+':0};
    ages.forEach(a=>{
      if(a<30) bins['<30']++; else if(a<40) bins['30-39']++; else if(a<50) bins['40-49']++; else if(a<60) bins['50-59']++;
      else if(a<70) bins['60-69']++; else if(a<80) bins['70-79']++; else if(a<90) bins['80-89']++; else bins['90+']++;
    });
    const dt = new google.visualization.DataTable(); dt.addColumn('string','Grupo'); dt.addColumn('number','Pacientes');
    Object.entries(bins).forEach(([k,v])=>dt.addRow([k,v]));
    new google.visualization.ColumnChart(el).draw(dt, { legend:'none', colors:['#06b6d4'], height:240, vAxis:{minValue:0}, chartArea:{left:50, top:20, width:'80%', height:'75%'} });
  });
}
function drawLOS(){
  whenCharts(()=>{
    const los = DATA.map(d=>d._los).filter(Number.isFinite);
    const el = document.getElementById("chartLOS");
    if(!los.length){ el.innerHTML='<div class="text-muted">Sin LOS</div>'; return; }
    const bins={'1-2':0,'3-7':0,'8-14':0,'15-30':0,'>30':0};
    los.forEach(x=>{ if(x<=2) bins['1-2']++; else if(x<=7) bins['3-7']++; else if(x<=14) bins['8-14']++; else if(x<=30) bins['15-30']++; else bins['>30']++; });
    const dt = new google.visualization.DataTable(); dt.addColumn('string','Días'); dt.addColumn('number','Pacientes');
    Object.entries(bins).forEach(([k,v])=>dt.addRow([k,v]));
    new google.visualization.PieChart(document.getElementById('chartLOS')).draw(dt,{height:240,pieHole:.45,chartArea:{left:20,top:10,width:'90%',height:'85%'},legend:{position:'labeled',textStyle:{fontSize:12}}});
  });
}
function drawVI(){
  whenCharts(()=>{
    const vals = DATA.map(d => String(d["ventilacion_invasiva"]||"").toLowerCase());
    const yes = vals.filter(v => /^si|sí|s|true|1$/.test(v)).length, no = vals.length-yes;
    const dt = new google.visualization.DataTable(); dt.addColumn('string','VI'); dt.addColumn('number','Pacientes');
    dt.addRow(['Con VI', yes]); dt.addRow(['Sin VI', no]);
    new google.visualization.PieChart(document.getElementById('chartVI')).draw(dt,{height:240,colors:['#ef4444','#10b981'],chartArea:{left:20,top:10,width:'90%',height:'85%'},legend:{position:'labeled',textStyle:{fontSize:12}}});
  });
}
function drawAll(){
  updateKPIs();
  drawAdmissions();
  drawAges();
  drawLOS();
  drawVI();
  drawTable();
}

// =============== REGISTRO (ESCRITURA) ===============
function toggleRegistroUIMode(){
  const embed = document.getElementById("registro_form_embed");
  const api   = document.getElementById("registro_form_api");
  if(CONFIG.MODE === "google-form"){
    embed.style.display = "";
    api.style.display   = "none";
    const f = document.getElementById("gform");
    if(CONFIG.GOOGLE_FORM_EMBED_URL){ f.src = CONFIG.GOOGLE_FORM_EMBED_URL; }
    else { f.parentElement.innerHTML = '<div class="alert alert-warning">Configura GOOGLE_FORM_EMBED_URL en CONFIG.</div>'; }
  }else{
    embed.style.display = "none";
    api.style.display   = "";
  }
}
function clearRegistro(){
  ["r_correo","r_nombre","r_fnac","r_edad","r_fing","r_feg","r_reg","r_pron","r_ap","r_so","r_dias","r_med","r_cond","r_origen","r_tipo","r_lugar","r_vi","r_vvc","r_cat","r_kpc","r_arch","r_obs","r_trasl"]
  .forEach(id => { const el = document.getElementById(id); if(el) el.value = ""; });
  document.getElementById("saveMsg").textContent = "—";
}
function buildRecord(){
  const val = id => (document.getElementById(id)?.value || "").trim();
  const multi = s => s ? s.split(";").map(x=>x.trim()).filter(Boolean) : [];
  return {
    direccion_de_correo_electronico: val("r_correo"),
    nombre_y_apellido: val("r_nombre"),
    fecha_de_nacimiento: val("r_fnac"),
    edad: val("r_edad"),
    fecha_de_ingreso: val("r_fing"),
    fecha_de_egreso: val("r_feg"),
    registro_de_internacion: val("r_reg"),
    prontuario: val("r_pron"),
    medico_tratante: multi(val("r_med")),
    condicion_al_egreso: multi(val("r_cond")),
    dias_de_internacion: val("r_dias"),
    apache_ii_a_las_24_h_del_ingreso: val("r_ap"),
    sofa_a_las_48_h_del_ingreso: val("r_so"),
    origen_del_paciente: multi(val("r_origen")),
    tipos_de_pacientes: multi(val("r_tipo")),
    kpc_mbl_positivo_en_pacientes: val("r_kpc"),
    cateter_de_hemodialisis: val("r_cat"),
    via_venosa_central: val("r_vvc"),
    ventilacion_invasiva: val("r_vi"),
    archivo: val("r_arch"),
    observaciones: val("r_obs"),
    lugar_del_egreso: multi(val("r_lugar")),
    traslados_internos_por_estancia_prolongada_del_primer_y_tercer_piso_al_segundo: val("r_trasl")
  };
}
async function saveRegistro(){
  const msg = document.getElementById("saveMsg");
  const rec = buildRecord();
  if(!rec.nombre_y_apellido || !rec.fecha_de_ingreso){
    msg.textContent = "Complete al menos: nombre y fecha de ingreso";
    notify("Complete al menos: nombre y fecha de ingreso","error");
    return;
  }
  if(!CONFIG.API_BASE || !CONFIG.AUTH_TOKEN){
    notify("Configura API_BASE y token (Login API).","error");
    msg.textContent = "Falta API o token";
    return;
  }
  try{
    msg.textContent = "Guardando…";
    const r = await fetch(CONFIG.API_BASE.replace(/\/+$/,"") + "/records", {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization":"Bearer "+CONFIG.AUTH_TOKEN },
      body: JSON.stringify(rec)
    });
    const j = await r.json().catch(()=> ({}));
    if(!r.ok || (j.ok === false)) throw new Error(j.error || r.statusText || "Error API");
    msg.textContent = "✓ Guardado";
    notify("Registro guardado correctamente","success");
    clearRegistro();
  }catch(e){
    msg.textContent = "Error: "+(e?.message||e);
    notify("Error al guardar: "+(e?.message||e),"error");
  }
}

// =============== LOGIN LOCAL (guardar API & token) ===============
function openLogin(){ document.getElementById("loginBox").style.display = "flex"; }
function closeLogin(){ document.getElementById("loginBox").style.display = "none"; }
function doLogin(){
  const base = document.getElementById("loginApi").value.trim();
  const tok  = document.getElementById("loginTok").value.trim();
  if(!base || !tok){ notify("Completa base y token","error"); return; }
  localStorage.setItem("uci_api_base", base);
  localStorage.setItem("uci_api_token", tok);
  CONFIG.API_BASE = base; CONFIG.AUTH_TOKEN = tok;
  notify("Credenciales guardadas","success"); closeLogin();
}
function doLogout(){
  localStorage.removeItem("uci_api_base");
  localStorage.removeItem("uci_api_token");
  CONFIG.API_BASE=""; CONFIG.AUTH_TOKEN="";
  notify("Credenciales eliminadas","info");
}

// =============== TABS & EVENTOS ===============
function setupTabs(){
  document.querySelectorAll(".tablink").forEach(b=>{
    b.addEventListener("click", ()=>{
      document.querySelectorAll(".tablink").forEach(x=>x.classList.remove("active"));
      document.querySelectorAll("main .panel").forEach(p=>p.hidden=true);
      b.classList.add("active");
      document.getElementById(b.dataset.tab).hidden=false;
      if(b.dataset.tab==="tablero") drawAll();
    });
  });
}

// =============== SW (opcional) ===============
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(_=>{});
  });
}

// =============== BOOTSTRAP PRINCIPAL ===============
window.addEventListener("DOMContentLoaded", async () => {
  diag("inicializando…");
  setupTabs();
  toggleRegistroUIMode();

  // Controles Tablero
  document.getElementById("btnApply").addEventListener("click", ()=>applyFilters());
  document.getElementById("btnReset").addEventListener("click", ()=>{ initDateBounds(); applyFilters(); });
  document.querySelectorAll('.chart-type[data-chart="admisiones"]').forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll('.chart-type[data-chart="admisiones"]').forEach(x=>x.classList.remove("active"));
      btn.classList.add("active"); drawAdmissions();
    });
  });

  // Controles Registro API
  const g = id => document.getElementById(id);
g("btnGuardar").addEventListener("click", () => guardar(false));  // usa OAuth Sheets
g("btnLimpiar").addEventListener("click", clearRegistro);

// Oculta controles de “Login API” porque no se usan con OAuth
const loginBtn = g("btnLogin"); if (loginBtn) loginBtn.style.display = "none";
const loginBox = g("loginBox"); if (loginBox) loginBox.style.display = "none";

  g("btnLogin").addEventListener("click", openLogin);
  g("doLogin").addEventListener("click", doLogin);
  g("doLogout").addEventListener("click", doLogout);
  g("loginBox").addEventListener("click", e => { if(e.target.id==="loginBox") closeLogin(); });

  // Carga de datos estáticos para Tablero
  try{
    await loadStaticData();
  }catch(e){
    notify("Error cargando datos: "+(e?.message||e),"error");
    diag("fallo carga: "+(e?.message||e));
  }
});
