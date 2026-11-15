# SumarImpacto · Tercera entrega · Grupo 34
**Desarrollo Web Backend · Comisión 2C · IFTS 29**  
**Estudiante: Jonatan Emanuel Uribio**  
Versión 3.1.0 · Preparación: 14 de noviembre de 2026.

API REST y panel para registrar aportes y gastos de proyectos sociales. Continúa la segunda entrega real, conserva reglas financieras y agrega autenticación, roles, validaciones, resumen de fondos y asistente guiado. La etapa inicial fue un CRUD de personas; ver `docs/MATRIZ_VERSIONES.md`.

## Inicio rápido (sin instalar MongoDB)
Requisito: Node.js 22 LTS con npm y conexión a Internet para la primera descarga.
Desde **Version_3.0**, la carpeta que contiene este README y package.json:

```powershell
npm ci
npm run demo
```
Abrí **http://localhost:3000**. La terminal muestra email y contraseña aleatoria de demostración. No hace falta crear `.env` para este modo. Ctrl+C detiene el servidor. La base temporal es MongoDB real, pero **sus datos se eliminan al detenerlo**. Este modo sirve para conocer el sistema y ensayar; no acredita Atlas ni persistencia entre sesiones.

## Ejecución persistente (MongoDB local o Atlas)
```powershell
npm ci
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copiá el secreto generado en JWT_SECRET dentro de `.env`. Configurá ADMIN_EMAIL y ADMIN_PASSWORD (12 caracteres o más, sin el texto CAMBIAR). Para local: MongoDB Community debe ser un replica set activo, con replicaSet=rs0 como el ejemplo. Un servidor standalone no permite transacciones. Para simplificar la entrega, usar Atlas o npm run demo para ensayar. Para Atlas: colocá la URI del cluster y el nombre de base `sumarimpacto_tp3`; no publiques usuario ni clave. APP_ORIGIN debe ser el origen exacto (por defecto `http://localhost:3000`).

```powershell
npm run seed
npm start
```
El seed crea al administrador si no existe; agrega ejemplos ficticios solo si no hay organizaciones. No borra registros ni cambia claves existentes. Ingresá con la cuenta que configuraste. Sin seed no existe un usuario inicial. En macOS/Linux usá `cp .env.example .env`. No uses `npm run demo` para datos persistentes.

## Uso del panel
1. Iniciá sesión. El tablero separa recibido, asignado, sin asignar, gastos y saldos.
2. Creá una organización y un donante con los formularios de sus pestañas.
3. Creá un proyecto y elegí una organización existente. Podés filtrar proyectos por organización.
4. Registrá una donación asociando el donante y, opcionalmente, un proyecto.
5. Registrá un gasto para un proyecto con saldo suficiente.
6. En Proyectos, abrí **Saldo y movimientos**; comprobá los importes.
7. Editá un proyecto o eliminá uno vacío. La donación solo se edita con rol admin y si su proyecto de origen no tiene gastos.
8. El botón de ayuda funciona antes y después del login: explica cómo colaborar y contactarse.

Una donación es un **registro administrativo** de un aporte recibido, no un cobro. No se integra una pasarela ni se solicitan tarjetas o datos bancarios. El contacto aparece si configurás CONTACT_EMAIL. No hay envío automático de correos ni conversación con una persona.

## Arquitectura y decisiones
`app.js` configura Express 5, Helmet, JSON limitado, cookies, origen, archivos públicos y errores. `routes/apiRoutes.js` relaciona verbos HTTP con controladores. `controllers/impactoController.js` valida referencias y reglas y consulta modelos. `models/` define Mongoose; `config/db.js` conecta a MongoDB. `views/index.pug` genera la página y `public/app.js` consume la API con fetch. `services/password.js` usa scrypt de Node. Se mantiene MVC sin incorporar una arquitectura ajena al alcance.

El navegador envía JSON, pasa middleware, llega al controlador, consulta Mongoose y recibe JSON con código HTTP. Express 5 propaga rechazos async al manejador central; los controladores históricos conservan su wrapper `conErrores`. Ver la documentación técnica para el recorrido de cada operación.

## Reglas de negocio
- **RN01:** proyecto requiere organización; donación requiere donante; gasto requiere proyecto. Referencias inexistentes: 404; ObjectId inválido: 400.
- **RN02:** monto numérico de 1 a 1.000.000.000 ARS, hasta dos decimales. Se rechazan strings, negativos y precisión excesiva. Se suman centavos redondeados para calcular saldo.
- **RN03:** donación sin proyecto se registra y suma al recibido global, pero no al saldo de un proyecto. No se importa automáticamente el JSON histórico.
- **RN04:** saldo del proyecto = donaciones asignadas − gastos. Ejemplo: 50 − 30 = 20; gasto nuevo de 25 se rechaza con 400 y no modifica la base.
- **RN05:** no se permite borrar proyectos con movimientos. 400; sin movimientos: 200.
- **RN06:** si el proyecto de origen ya tiene gastos, se bloquea toda modificación de sus donaciones. Regla conservadora heredada; no se conoce qué aporte financió cada gasto. Un aporte sin asignar se puede asignar mediante PUT con rol admin.
- **RN07:** movimientos y borrado de proyectos se coordinan mediante transacciones y un documento ControlFinanciero en MongoDB. La comprobación de saldo y el alta de gasto se confirman juntas, incluso entre procesos distintos. Requiere Atlas o replica set. No protege cambios directos externos. Ver services/finanzas.js y docs/VERCEL_ATLAS.md.
- **RN08:** no hay borrado de movimientos. Se conserva el historial; sin contabilidad formal ni reversas en esta instancia académica.

Fórmulas del panel: recibido = asignado + sin asignar; saldo proyectos = asignado − gastos; saldo global = recibido − gastos = saldo proyectos + sin asignar. El objetivo del proyecto es una meta, no dinero disponible. Los montos se expresan en ARS.

## Autenticación y autorización
Login mediante email y clave; password con salt aleatorio y scrypt. JWT HS256 de dos horas en cookie HttpOnly, SameSite=Strict y Secure en producción. No se guarda el token en localStorage. El rol se consulta en MongoDB en cada petición, no se confía en el rol enviado por el cliente. Se aceptan tokens Bearer para herramientas; el login web usa cookie.

| Operación | admin | operador | consulta |
|---|---|---|---|
| Consultas de datos y saldos | Sí | Sí | Sí |
| Altas y edición de proyectos | Sí | Sí | No |
| Registro de donaciones y gastos | Sí | Sí | No |
| Edición de donaciones y borrado de proyecto vacío | Sí | No | No |

No hay registro público ni administración de usuarios por web. Para crear otro rol, añadí temporalmente a `.env` NUEVO_EMAIL, NUEVA_CLAVE (12+) y NUEVO_ROL (`operador` o `consulta`) y ejecutá `node scripts/crear-usuario.js`; luego quitá esas tres variables. No registres credenciales reales en video. Logout borra la cookie; un token robado previamente conserva validez hasta expirar (no hay lista de revocación).

Helmet restringe scripts; la UI usa archivos externos y textContent. Se rechazan campos inesperados y operadores de MongoDB por allowlist. JSON máximo 16 KB. Login limitado a 20 solicitudes por 15 minutos e IP; chat a 30 por minuto. Se valida Origin cuando está presente y se exige JSON para escrituras con cuerpo; no se habilita CORS. Los límites de tasa son por proceso.

## API
Todo bajo `/api`, salvo página `/` y salud `/health`. Sin sesión: 401; rol insuficiente: 403.

| Método | Ruta | Función |
|---|---|---|
| POST | /api/auth/login | `{email,clave}`; devuelve cookie |
| POST | /api/auth/logout | Elimina cookie |
| GET | /api/auth/me | Usuario y rol actual |
| POST | /api/chat | Público, `{mensaje}` de 1–500 caracteres |
| GET / POST | /api/organizaciones | Listado / alta |
| GET / POST | /api/donantes | Listado / alta |
| GET / POST | /api/proyectos | Listado / alta; filtro `?organizacion_id=ID` |
| GET / PUT / DELETE | /api/proyectos/:id | Consulta / edición / baja restringida |
| GET | /api/proyectos/:id/saldo | total_donado, total_gastado, saldo_disponible |
| GET | /api/proyectos/:id/donaciones | Movimientos de entrada |
| GET | /api/proyectos/:id/gastos | Movimientos de salida |
| GET / POST | /api/donaciones | Listar / registrar |
| PUT | /api/donaciones/:id | Corrección permitida por RN06 |
| GET / POST | /api/gastos | Listar / registrar con saldo |
| GET | /api/resumen | Totales globales diferenciados |

Códigos: 200 consulta/edición/baja; 201 alta; 400 validación/regla; 401 sesión; 403 permisos/origen; 404 inexistente; 409 duplicado único; 413 cuerpo excesivo; 429 límite de tasa; 500 fallo interno sin exponer stack.

## Pruebas y defensa
```powershell
npm test
```
Supertest + Node Test + MongoDB Memory Server prueban HTTP contra una base temporal aislada. La primera ejecución descarga MongoDB. No requiere Atlas ni modifica tu base de trabajo. `docs/RESULTADOS_PRUEBAS.txt` contiene la ejecución real de preparación; `docs/PRUEBAS.md` explica pasos y resultados. Colección Postman en `docs/SumarImpacto_Postman.json`: iniciar sesión, ejecutar los pasos en orden y guardar los IDs. Usa el administrador configurado; no contiene claves reales.

## Atlas y despliegue
Ver `docs/DESPLIEGUE.md`. El código exporta Express, reutiliza la conexión MongoDB y contiene vercel.json con las vistas. Está preparado para Vercel con MongoDB Atlas y HTTPS. Esta entrega descargable **no incluye un cluster creado ni una URL publicada**: se deben configurar con tu cuenta. `npm run demo` no reemplaza ese requisito. No se afirma que se verificaron Atlas o producción.

## Matriz, PDF y entrega
`docs/MATRIZ_VERSIONES.md`: evolución y tecnologías. `docs/DOCUMENTACION.md` y PDF: objetivos, RF/RNF, reglas, módulos, pruebas y bibliografía. `docs/DIAGRAMAS.md`: modelo, casos de uso y secuencia. `docs/ENLACES_ENTREGA.md`: campos para los enlaces definitivos del video, despliegue y carpeta principal. **El PDF debe actualizarse con esos enlaces antes de entregarse.**

La publicación del campus copiada por el estudiante pide un enlace individual y en oficinas. El PDF adjunto además pide comprimido y copias anteriores. Se preparan las tres versiones separadas en el ZIP; verificá en el aula qué campo admite adjuntos y conservá el mismo enlace en la entrega y el foro. El cierre indicado es 15/11/2026 a las 23:58, según el campus.

## Bibliografía y uso de IA
Consignas y documentos de las primeras dos entregas proporcionados por el estudiante; devolución del profesor. Referencias técnicas: https://nodejs.org/api/crypto.html, https://expressjs.com/en/5x/guide/error-handling/, https://mongoosejs.com/docs/8.x/docs/validation.html, https://www.mongodb.com/docs/atlas/connect-to-database-deployment/, https://pugjs.org/api/getting-started.html, https://github.com/auth0/node-jsonwebtoken, https://helmetjs.github.io/, https://express-rate-limit.mintlify.app/. No se afirma haber consultado libros o videos no aportados.

Se utilizó ChatGPT para analizar las consignas, ampliar el código, preparar pruebas y redactar documentación. Se adaptó el contenido al repositorio real y al alcance académico. Jonatan debe revisar y comprender cada decisión antes de defenderla; este paquete no acredita trabajo manual o grabación aún no realizados.

## Actualizar el PDF al completar los enlaces
Editá `docs/ENLACES_ENTREGA.md` con repo, video, URL y Drive reales. Para regenerar el PDF en Windows, necesitás Python y estos comandos desde Version_3.0:

```powershell
py -m pip install reportlab pillow
py docs/generar_pdf.py
```

El PDF usa las fuentes y el diagrama incluidos; no necesitás Graphviz para regenerarlo. Si cambiás el modelo, actualizá también sus diagramas. Abrí el PDF generado y verificá enlaces y diseño antes de enviar.

## Actualización del asistente · 15/11/2026
Ver `docs/CHATBOT.md`: 29 temas, sinónimos, preguntas de aclaración, seguimiento del último tema y sugerencias relacionadas. El catálogo está separado en `data/preguntasFrecuentes.json`. No se almacena el historial en MongoDB. CONTACT_EMAIL, CONTACT_PHONE y CONTACT_HOURS muestran canales reales cuando se configuran. Sin esos datos no se inventa un contacto. Para ensayar: «Hola, quiero donar» → «¿y sin elegir uno?», o «No me deja registrar un gasto».

La versión 3.0.1 incluye el arranque de demo y tests adaptado a Windows. Resultado de esa revisión: 44 tests aprobados, 0 fallidos; se incluye la regresión HTTP original. Las versiones históricas se conservan sin cambios.

## Preparación para Vercel · 3.1.0 · 15/11/2026
Seguir `docs/VERCEL_ATLAS.md`. Usar Version_3.0 como raíz. El directorio mantiene su nombre para facilitar la actualización; package.json y /health identifican 3.1.0. Vercel instala dependencias de producción y sirve public/. No se usa npm run demo en el alojamiento. Seed se ejecuta desde PC contra Atlas antes de publicar.

Se reemplazó la cola de proceso por transacciones con coordinación en MongoDB. `tests/distribuido.test.js` usa dos procesos HTTP independientes contra un replica set: dos gastos de 70 sobre saldo 100 producen 201/400 y saldo 30; también prueba rollback y edición de donación simultánea con gasto. Se verifican arranques con conexión diferida y configuración de entorno. La suite actual: 48 pruebas aprobadas y 0 fallidas. No se hizo un despliegue remoto porque faltan las cuentas/conexión de Atlas.
