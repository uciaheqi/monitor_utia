/* ============================================================
 *  Registro UCI – Escritura directa a Google Sheets (OAuth) v1
 *  - Cliente puro (GitHub Pages): sin backend y sin Apps Script
 *  - Autenticación con Google Identity Services (token de acceso)
 *  - Append de filas con Sheets API v4 (USER_ENTERED)
 * ============================================================ */

/*** CONFIGURACIÓN ***/
const OAUTH = {
  CLIENT_ID: "TU_CLIENT_ID.apps.googleusercontent.com", // <- pon el tuyo
  SCOPES: "https://www.googleapis.com/auth/spreadsheets"
};
const SHEET = {
  ID: "TU_SPREADSHEET_ID",   // <- ID del Google Sheet
  TAB: "base"                // <- nombre de hoja (pestaña)
};

/*** CABECERAS en el orden que se guardan ***/
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

/*** Estado de Google APIs ***/
let tokenClient, gapiInited = false, gisInited = false;

/*** Carga de GAPI (discovery) ***/
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

/*** Carga de GIS (Identity) ***/
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

  si?.addEventListener('click', handleAuthClick, { once: true });
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

/*** Utilidades de fecha y normalización ***/
function parseDate(s) {
  if (!s) return '';
  const d = new Date(String(s));
  return Number.isFinite(+d) ? d : '';
}
function fmtISODate(d) {
  if (!(d instanceof Date) || !Number.isFinite(+d)) return '';
  return d.toISOString().slice(0, 10);
}
function daysDiff(d1, d2) {
  if (!(d1 instanceof Date) || !(d2 instanceof Date)) return '';
  const a = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const b = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  const dd = Math.round((b - a) / 86400000);
  return dd >= 0 ? dd : '';
}
function calcAge(birth, ref) {
  if (!(birth instanceof Date) || !(ref instanceof Date)) return '';
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
  return (age >= 0 && age <= 120) ? age : '';
}
function siNo(x) {
  const s = String(x || '').trim().toLowerCase();
  if (['si','sí','s','yes','y','1','true','verdadero'].includes(s)) return 'Sí';
  if (['no','n','0','false','falso'].includes(s)) return 'No';
  return '';
}
function intOrEmpty(x) {
  if (x === null || x === undefined || x === '') return '';
  const n = Number(x);
  return Number.isFinite(n) ? Math.trunc(n) : '';
}

/*** Construcción de la fila según HEADERS (reutiliza tus IDs actuales) ***/
function buildRowFromForm() {
  const val = id => (document.getElementById(id)?.value || '').trim();

  const correo  = val('correo');
  const fnac    = parseDate(val('fechaNacimiento'));
  const fing    = parseDate(val('fechaIngreso'));
  const fegr    = parseDate(val('fechaEgreso'));

  const edad    = val('edad') || (fnac && fing ? calcAge(fnac, fing) : '');
  const dias    = (fing && fegr) ? daysDiff(fing, fegr) : '';

  const radio = name => {
    const si = document.getElementById(`${name}_si`);
    const no = document.getElementById(`${name}_no`);
    return si?.checked ? 'Sí' : (no?.checked ? 'No' : '');
  };

  const fila = {
    'Marca temporal': new Date().toISOString(),
    'Dirección de correo electrónico': correo,
    'Fecha de Nacimiento': fmtISODate(fnac),
    'Nombre y Apellido': val('nombreApellido'),
    'Edad': edad,
    'Fecha de Ingreso': fmtISODate(fing),
    'Fecha de Egreso': fmtISODate(fegr),
    'Registro de Internación': intOrEmpty(val('registroInternacion')),
    'Prontuario': intOrEmpty(val('prontuario')),
    'Médico Tratante': val('medicoTratante'),
    'Condición al Egreso': val('condicionEgreso'),
    'Días de Internación': dias,
    'APACHE II a las 24 h del ingreso': intOrEmpty(val('apache2')),
    'SOFA a las 48 h del ingreso': intOrEmpty(val('sofa48')),
    'Origen del Paciente': val('origenPaciente'),
    'Tipos de Pacientes': val('tipoPaciente'),
    'KPC/MBL POSITIVO EN PACIENTES': val('kpcMbl'),
    'Catéter de Hemodiálisis': intOrEmpty(val('cateterHd')),
    'Vía Venosa Central': intOrEmpty(val('vvc')),
    'Ventilación Invasiva': radio('vi'),
    'Líneas Arteriales': intOrEmpty(val('lineasArt')),
    'Tubo de drenaje pleural (hechos por UCIA)': radio('tubodren'),
    'Traqueostomías (hechos por UCIA)': radio('traqueo'),
    'Uso de CAF': radio('caf'),
    'Electrocardiograma': intOrEmpty(val('ecg')),
    'POCUS': radio('pocus'),
    'Doppler transcraneal': radio('dopplertc'),
    'Fibrobroncoscopia': radio('fibro'),
    'Observaciones': val('observaciones')
  };

  // Devuelve array ordenado según HEADERS
  return HEADERS.map(h => (fila[h] !== undefined ? fila[h] : ''));
}

/*** Append a Sheets ***/
async function appendRowToSheet(values) {
  // range puede ser simplemente el nombre de la pestaña
  const range = `${SHEET.TAB}!A1`;
  const res = await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SHEET.ID,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [values] }
  });
  return res;
}

/*** Reemplazo de tu función guardar(nuevo) para usar Sheets API ***/
window.guardar = async function (nuevo) {
  try {
    // Valida tu pestaña/obligatorios con tus funciones existentes
    if (typeof validateTab === 'function' && !validateTab(window.currentTab || 'identification')) {
      window.showToastWarn?.('Complete los campos obligatorios.');
      return;
    }
    const must = ['nombreApellido','fechaIngreso','medicoTratante','condicionEgreso','origenPaciente','tipoPaciente'];
    for (const id of must) {
      const el = document.getElementById(id);
      if (!el || !String(el.value || '').trim()) {
        window.showToastWarn?.('Complete los campos obligatorios.');
        return;
      }
    }

    // Asegura token (si no hay, abre prompt)
    if (!gapi.client.getToken()) {
      await handleAuthClick();
    }

    const row = buildRowFromForm();
    await appendRowToSheet(row);

    window.showToastOk?.('Registro guardado.');
    if (nuevo && typeof limpiarFormulario === 'function') {
      limpiarFormulario(true);
    }
  } catch (e) {
    console.error(e);
    window.showToastErr?.('Error al guardar: ' + (e.result?.error?.message || e.message || e));
  }
};
