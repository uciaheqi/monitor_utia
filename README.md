# UCI Analytics — Registro & Tablero (GitHub Pages)

Esta plantilla publica un **tablero** (solo lectura) y un **formulario de registro** (escritura) sobre datos alojados en **Google Sheets**.

## Estructura
```
uci-analytics-site/
├─ index.html
├─ assets/
│  ├─ css/style.css
│  └─ js/main.js
├─ data/
│  ├─ data.json         # generado automáticamente por el workflow
│  └─ build.json        # sello de compilación
├─ .github/workflows/update-data.yml
├─ manifest.webmanifest
└─ sw.js
```

## Dos modos de registro
- **`MODE: "google-form"` (por defecto):** embebe un Google Form vinculado a tu hoja. Rápido y sin backend.
- **`MODE: "api"`:** envía un `POST /records` a tu API (FastAPI/Cloud Run/Render) para escribir directamente en la hoja.

Cambia el modo y los parámetros en `assets/js/main.js` (objeto `CONFIG`).

## GitHub Pages
1. Sube este contenido a tu repositorio.
2. En **Settings → Pages**, selecciona **Branch: `main`** (o la rama que uses) y carpeta `/ (root)`.
3. Espera a que se publique; tu sitio quedará disponible como `https://usuario.github.io/repositorio`.

## Actualización automática diaria (GitHub Actions)
El workflow `.github/workflows/update-data.yml` lee la hoja de cálculo y actualiza `data/data.json` y `data/build.json` **cada día** (y on-demand con _Run workflow_).

### Secretos requeridos
Crea estos **Secrets** en `Settings → Secrets and variables → Actions → New repository secret`:

- `GSA_EMAIL` — correo de tu **Service Account** (formato `xxxxx@project.iam.gserviceaccount.com`).
- `GSA_KEY` — **private key** de la Service Account (pega el contenido de la clave JSON reemplazando saltos de línea por `\n`).
- `SHEET_ID` — ID de tu Google Sheet (lo que va entre `/d/` y `/edit` en la URL).
- `SHEET_TAB` — *(opcional)* nombre de la pestaña (Worksheet). Si no lo defines, usa la primera.

**Importante:** comparte la hoja con el email de la Service Account con al menos permiso de **lector**.

### Encabezados esperados en la hoja
Se normalizan a *snake_case* (minúsculas, sin acentos). Asegúrate de tener, idealmente, estas columnas (o equivalentes que normalicen a lo mismo):

- `fecha_de_ingreso` *(requerida)*
- `fecha_de_egreso`
- `edad`
- `apache_ii_a_las_24_h_del_ingreso`
- `sofa_a_las_48_h_del_ingreso`
- `dias_de_internacion`
- `condicion_al_egreso`
- `origen_del_paciente`
- `tipos_de_pacientes`
- `medico_tratante`
- `ventilacion_invasiva`

> Si tus encabezados incluyen acentos/espacios, el workflow los normaliza (p.ej., `Condición al egreso` → `condicion_al_egreso`).

## Registro (escritura)
- **Google Forms:** reemplaza la URL `GOOGLE_FORM_EMBED_URL` en `main.js` por la de tu formulario (`…/viewform?embedded=true`).
- **API propia:** cambia `MODE` a `"api"`, define `API_BASE` y usa **Login API** (token Bearer). El endpoint esperado es `POST /records` con el JSON que construye `buildRecord()`.

## Desarrollo local
Simplemente abre `index.html` en el navegador. Los datos de ejemplo están en `data/`. El workflow los sobrescribirá cuando lo configures con tu hoja.

---

**Diego**: cualquier duda de mapeos/encabezados, dime y lo ajustamos.


---
## Configuración rápida (OAuth + Google Sheets, sin Apps Script)
1. Habilita **Google Sheets API** y crea un **OAuth Client ID (Web)** en Google Cloud.
2. Edita `assets/js/gsheets.js` y reemplaza:
   - `REEMPLAZAR_CLIENT_ID.apps.googleusercontent.com`
   - `REEMPLAZAR_SPREADSHEET_ID`
3. Sube a GitHub Pages. Pulsa **Acceder** (arriba a la derecha) para autorizar.
4. El **Registro** guardará filas directo en `base`. El **Tablero** intentará leer en vivo si hay sesión; de lo contrario usa `data/data.json` como respaldo.

### (Opcional) Actualización diaria con GitHub Actions
Agregamos `.github/workflows/build-data-daily.yml` para construir `data/data.json` y `data/build.json` cada día, usando un **Service Account**:
- Guarda el JSON de la cuenta de servicio en el _Secret_ `GOOGLE_CREDENTIALS`.
- Crea el _Repository Variable_ `SHEET_ID` con el ID de la hoja.
- Comparte la hoja con el mail de la cuenta de servicio (rol Lector).

