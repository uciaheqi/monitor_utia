// ============================================================
//  Registro UCI – Google Sheets (OAuth) v2
//  - Cliente 100% front-end (GitHub Pages)
//  - Guardado + lectura de la pestaña 'base'
//  - Sin Apps Script ni backend propio
// ============================================================

/*** CONFIGURACIÓN (reemplazar por tus valores) ***/
const OAUTH = {
  CLIENT_ID: "REEMPLAZAR_CLIENT_ID.apps.googleusercontent.com",  // <-- pon tu Client ID de OAuth Web
  SCOPES: "https://www.googleapis.com/auth/spreadsheets"
};
const SHEET = {
  ID: "REEMPLAZAR_SPREADSHEET_ID",  // <-- pon el ID de tu Google Sheet
  TAB: "base"
};

/*** CABECERAS (orden exacto de columnas en la pestaña 'base') ***/
const HEADERS = [
  'Marca temporal',
  'Dirección de correo electrónico',
  'Fecha de Nacimiento',
  'Nombre y Apellido',
  'Edad',
  'Fecha de Ingreso',
  'Fecha de Egreso',
  'Registro de Internación',
  'Prontuario',
  'Médico Tratante',
  'Condición al Egreso',
  'Días de Internación',
  'APACHE II a las 24 h del ingreso',
  'SOFA a las 48 h del ingreso',
  'Origen del Paciente',
  'Tipos de Pacientes',
  'KPC/MBL POSITIVO EN PACIENTES',
  'Catéter de Hemodiálisis',
  'Vía Venosa Central',
  'Ventilación Invasiva',
  'Líneas Arteriales',
  'Tubo de drenaje pleural (hechos por UCIA)',
  'Traqueostomías (hechos por UCIA)',
  'Uso de CAF',
  'Electrocardiograma',
  'POCUS',
  'Doppler transcraneal',
  'Fibrobroncoscopia',
  'Observaciones'
];

/*** Estado Google APIs ***/
let tokenClient, gapiInited = false, gisInited = false;

window.gapiLoaded = async function () {
  try {
    await new Promise(resolve => gapi.load('client', resolve));
    await gapi.client.init({
      discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
    });
    gapiInited = true;
    maybeEnableAuth();
  } catch (e) {
    console.error("Error inicializando gapi:", e);
  }
};

window.gisLoaded = function () {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: OAUTH.CLIENT_ID,
    scope: OAUTH.SCOPES,
    callback: () => {}
  });
  gisInited = true;
  maybeEnableAuth();
};

function maybeEnableAuth() {
  if (!(gapiInited && gisInited)) return;
  const si = document.getElementById('btnSignIn');
  const so = document.getElementById('btnSignOut');
  if (si) si.disabled = false;
  si?.addEventListener('click', handleAuthClick);
  so?.addEventListener('click', handleSignoutClick);
}

async function handleAuthClick() {
  return new Promise((resolve, reject) => {
    tokenClient.callback = (resp) => {
      if (resp.error) { reject(resp); return; }
      document.getElementById('btnSignIn')?.style && (document.getElementById('btnSignIn').style.display = 'none');
      document.getElementById('btnSignOut')?.style && (document.getElementById('btnSignOut').style.display = '');
      resolve();
    };
    const token = gapi.client.getToken();
    tokenClient.requestAccessToken({ prompt: token ? '' : 'consent' });
  });
}

function handleSignoutClick() {
  gapi.client.setToken('');
  document.getElementById('btnSignOut')?.style && (document.getElementById('btnSignOut').style.display = 'none');
  document.getElementById('btnSignIn')?.style && (document.getElementById('btnSignIn').style.display = '');
}

/*** Utilidades ***/
function parseDate(s){ if(!s) return ''; const d = new Date(String(s)); return Number.isFinite(+d) ? d : ''; }
function fmtISODate(d){ if(!(d instanceof Date) || !Number.isFinite(+d)) return ''; return d.toISOString().slice(0,10); }
function intOrEmpty(x){ if(x===null||x===undefined||x==='') return ''; const n=Number(x); return Number.isFinite(n)?Math.trunc(n):''; }
function daysDiff(d1,d2){ if(!(d1 instanceof Date)||!(d2 instanceof Date)) return ''; const a=new Date(d1.getFullYear(),d1.getMonth(),d1.getDate()); const b=new Date(d2.getFullYear(),d2.getMonth(),d2.getDate()); const dd=Math.round((b-a)/86400000); return dd>=0?dd:''; }
function calcAge(birth,ref){ if(!(birth instanceof Date)||!(ref instanceof Date)) return ''; let age=ref.getFullYear()-birth.getFullYear(); const m=ref.getMonth()-ref.getMonth(); return age>=0&&age<=120?age:''; }

/*** Construcción de fila desde el formulario (IDs r_*) ***/
function buildRowFromForm(){
  const val = id => (document.getElementById(id)?.value || '').trim();
  const correo  = val('r_correo');
  const fnac    = parseDate(val('r_fnac'));
  const fing    = parseDate(val('r_fing'));
  const fegr    = parseDate(val('r_feg'));
  const edad    = val('r_edad') || (fnac && fing ? calcAge(fnac, fing) : '');
  const dias    = (fing && fegr) ? daysDiff(fing, fegr) : '';

  const fila = {
    'Marca temporal': new Date().toISOString(),
    'Dirección de correo electrónico': correo,
    'Fecha de Nacimiento': fmtISODate(fnac),
    'Nombre y Apellido': val('r_nombre'),
    'Edad': edad,
    'Fecha de Ingreso': fmtISODate(fing),
    'Fecha de Egreso': fmtISODate(fegr),
    'Registro de Internación': intOrEmpty(val('r_reg')),
    'Prontuario': intOrEmpty(val('r_pron')),
    'Médico Tratante': val('r_med'),
    'Condición al Egreso': val('r_cond'),
    'Días de Internación': dias,
    'APACHE II a las 24 h del ingreso': intOrEmpty(val('r_ap')),
    'SOFA a las 48 h del ingreso': intOrEmpty(val('r_so')),
    'Origen del Paciente': val('r_origen'),
    'Tipos de Pacientes': val('r_tipo'),
    'KPC/MBL POSITIVO EN PACIENTES': val('r_kpc'),
    'Catéter de Hemodiálisis': val('r_cat'),
    'Vía Venosa Central': val('r_vvc'),
    'Ventilación Invasiva': val('r_vi'),
    'Líneas Arteriales': '',
    'Tubo de drenaje pleural (hechos por UCIA)': '',
    'Traqueostomías (hechos por UCIA)': '',
    'Uso de CAF': '',
    'Electrocardiograma': '',
    'POCUS': '',
    'Doppler transcraneal': '',
    'Fibrobroncoscopia': '',
    'Observaciones': val('r_obs')
  };
  return HEADERS.map(h => (fila[h] !== undefined ? fila[h] : ''));
}

/*** Append (escritura) ***/
async function appendRowToSheet(values){
  const range = `${SHEET.TAB}!A1`;
  return await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SHEET.ID,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [values] }
  });
}

/*** API público: guardar(false) reutilizado por main.js ***/
window.guardar = async function(){
  if (!gapi.client.getToken()) { await handleAuthClick(); }
  const row = buildRowFromForm();
  await appendRowToSheet(row);
};

/*** LECTURA para el tablero ***/
function toSnake(s){
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
}
const HEADER_MAP = {
  'fecha_de_ingreso':'Fecha de Ingreso',
  'fecha_de_egreso':'Fecha de Egreso',
  'edad':'Edad',
  'apache_ii_a_las_24_h_del_ingreso':'APACHE II a las 24 h del ingreso',
  'sofa_a_las_48_h_del_ingreso':'SOFA a las 48 h del ingreso',
  'dias_de_internacion':'Días de Internación',
  'condicion_al_egreso':'Condición al Egreso',
  'origen_del_paciente':'Origen del Paciente',
  'tipos_de_pacientes':'Tipos de Pacientes',
  'medico_tratante':'Médico Tratante',
  'ventilacion_invasiva':'Ventilación Invasiva'
};

window.fetchSheetRows = async function(){
  if (!gapi.client.getToken()) return null;
  const res = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SHEET.ID,
    range: SHEET.TAB
  });
  const rows = res.result.values || [];
  if (!rows.length) return [];

  const header = rows[0];
  const data = rows.slice(1).map(r => {
    const temp = {};
    header.forEach((h,i)=> temp[toSnake(h)] = r[i] ?? '' );
    const out = {};
    for (const key in HEADER_MAP){
      const hname = HEADER_MAP[key];
      out[key] = temp[toSnake(hname)] ?? '';
    }
    return out;
  });
  return data;
};
