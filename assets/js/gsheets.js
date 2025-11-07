/* ============================================================
 *  Registro UCI – Google Sheets OAuth (cliente puro) v1.1
 * ============================================================ */

const OAUTH = {
  CLIENT_ID: "TU_CLIENT_ID.apps.googleusercontent.com", // <- reemplazar
  SCOPES: "https://www.googleapis.com/auth/spreadsheets"
};
const SHEET = {
  ID: "TU_SPREADSHEET_ID",  // <- reemplazar
  TAB: "base"
};

const HEADERS = [
  'Marca temporal','Dirección de correo electrónico','Fecha de Nacimiento','Nombre y Apellido','Edad',
  'Fecha de Ingreso','Fecha de Egreso','Registro de Internación','Prontuario','Médico Tratante',
  'Condición al Egreso','Días de Internación','APACHE II a las 24 h del ingreso','SOFA a las 48 h del ingreso',
  'Origen del Paciente','Tipos de Pacientes','KPC/MBL POSITIVO EN PACIENTES','Catéter de Hemodiálisis',
  'Vía Venosa Central','Ventilación Invasiva','Líneas Arteriales','Tubo de drenaje pleural (hechos por UCIA)',
  'Traqueostomías (hechos por UCIA)','Uso de CAF','Electrocardiograma','POCUS','Doppler transcraneal',
  'Fibrobroncoscopia','Observaciones'
];

let tokenClient, gapiInited=false, gisInited=false;

// ---- Inicialización Google APIs ----
window.gapiLoaded = async function () {
  await new Promise(res => gapi.load('client', res));
  await gapi.client.init({
    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
  });
  gapiInited = true; maybeEnableAuth();
};

window.gisLoaded = function () {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: OAUTH.CLIENT_ID,
    scope: OAUTH.SCOPES,
    callback: () => {}
  });
  gisInited = true; maybeEnableAuth();
};

function maybeEnableAuth(){
  if(!(gapiInited && gisInited)) return;
  const si = document.getElementById('btnSignIn');
  const so = document.getElementById('btnSignOut');
  if (si) si.disabled = false;
  si?.addEventListener('click', handleAuthClick, { once:true });
  so?.addEventListener('click', handleSignoutClick);
}
async function handleAuthClick(){
  return new Promise((resolve, reject) => {
    tokenClient.callback = (resp) => {
      if (resp.error){ reject(resp); return; }
      const si = document.getElementById('btnSignIn');
      const so = document.getElementById('btnSignOut');
      if (si) si.style.display = 'none';
      if (so) so.style.display = '';
      resolve();
    };
    const token = gapi.client.getToken();
    tokenClient.requestAccessToken({ prompt: token ? '' : 'consent' });
  });
}
function handleSignoutClick(){
  gapi.client.setToken('');
  const si = document.getElementById('btnSignIn');
  const so = document.getElementById('btnSignOut');
  if (so) so.style.display = 'none';
  if (si) si.style.display = '';
}

// ---- Utilidades ----
const get = id => (document.getElementById(id)?.value || '').trim();
function parseDate(s){ if(!s) return ''; const d=new Date(String(s)); return Number.isFinite(+d)?d:''; }
function iso(d){ return (d instanceof Date && Number.isFinite(+d)) ? d.toISOString().slice(0,10) : ''; }
function days(d1,d2){ if(!(d1 instanceof Date)&&!(d2 instanceof Date)) return ''; const a=new Date(d1.getFullYear(),d1.getMonth(),d1.getDate()); const b=new Date(d2.getFullYear(),d2.getMonth(),d2.getDate()); const dd=Math.round((b-a)/86400000); return dd>=0?dd:''; }
function age(b,ref){ if(!(b instanceof Date)&&!(ref instanceof Date)) return ''; let a=ref.getFullYear()-b.getFullYear(); const m=ref.getMonth()-b.getMonth(); if(m<0||(m===0&&ref.getDate()<b.getDate())) a--; return (a>=0&&a<=120)?a:''; }
function intOrEmpty(x){ if(x===null||x===undefined||x==='') return ''; const n=Number(x); return Number.isFinite(n)?Math.trunc(n):''; }

// ---- Lee TU formulario (IDs r_*) ----
function buildRowFromForm(){
  // map flexible: primero busca r_*, si no hay, busca el id “viejo”
  const pick = (...ids) => {
    for (const id of ids){ const el=document.getElementById(id); if(el) return (el.value||'').trim(); }
    return '';
  };

  const correo  = pick('r_correo','correo');
  const nombre  = pick('r_nombre','nombreApellido');
  const fnac    = parseDate(pick('r_fnac','fechaNacimiento'));
  const fing    = parseDate(pick('r_fing','fechaIngreso'));
  const fegr    = parseDate(pick('r_feg','fechaEgreso'));

  const edad    = pick('r_edad','edad') || (fnac && fing ? age(fnac, fing) : '');
  const diasLOS = (fing && fegr) ? days(fing, fegr) : '';

  const fila = {
    'Marca temporal': new Date().toISOString(),
    'Dirección de correo electrónico': correo,
    'Fecha de Nacimiento': iso(fnac),
    'Nombre y Apellido': nombre,
    'Edad': edad,
    'Fecha de Ingreso': iso(fing),
    'Fecha de Egreso': iso(fegr),
    'Registro de Internación': intOrEmpty(pick('r_reg','registroInternacion')),
    'Prontuario': intOrEmpty(pick('r_pron','prontuario')),
    'Médico Tratante': pick('r_med','medicoTratante'),
    'Condición al Egreso': pick('r_cond','condicionEgreso'),
    'Días de Internación': diasLOS,
    'APACHE II a las 24 h del ingreso': intOrEmpty(pick('r_ap','apache2')),
    'SOFA a las 48 h del ingreso': intOrEmpty(pick('r_so','sofa48')),
    'Origen del Paciente': pick('r_origen','origenPaciente'),
    'Tipos de Pacientes': pick('r_tipo','tipoPaciente'),
    'KPC/MBL POSITIVO EN PACIENTES': pick('r_kpc','kpcMbl'),
    'Catéter de Hemodiálisis': intOrEmpty(pick('r_cat','cateterHd')),
    'Vía Venosa Central': intOrEmpty(pick('r_vvc','vvc')),
    'Ventilación Invasiva': pick('r_vi') || '',   // en tu UI es <select>
    'Líneas Arteriales': intOrEmpty(pick('r_lineasArt','lineasArt')),
    'Tubo de drenaje pleural (hechos por UCIA)': pick('r_tubodren') || '',
    'Traqueostomías (hechos por UCIA)': pick('r_traqueo') || '',
    'Uso de CAF': pick('r_caf') || '',
    'Electrocardiograma': intOrEmpty(pick('r_ecg','ecg')),
    'POCUS': pick('r_pocus') || '',
    'Doppler transcraneal': pick('r_dopplertc') || '',
    'Fibrobroncoscopia': pick('r_fibro') || '',
    'Observaciones': pick('r_obs','observaciones')
  };

  return HEADERS.map(h => (fila[h] !== undefined ? fila[h] : ''));
}

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

// expone la función para main.js
window.guardar = async function (nuevo){
  try{
    // pide token si hace falta
    if (!gapi.client.getToken()){
      await handleAuthClick();
    }
    const row = buildRowFromForm();
    await appendRowToSheet(row);

    // toasts si existen
    window.showToastOk?.('Registro guardado.');
    // etiqueta “saveMsg” si existe
    const sm = document.getElementById('saveMsg'); if(sm) sm.textContent = '✓ Guardado';

    if (nuevo && typeof limpiarFormulario === 'function'){
      limpiarFormulario(true);
    }
  }catch(e){
    console.error(e);
    const msg = e.result?.error?.message || e.message || String(e);
    window.showToastErr?.('Error al guardar: ' + msg);
    const sm = document.getElementById('saveMsg'); if(sm) sm.textContent = 'Error: ' + msg;
  }
};
