# Publicar SumarImpacto 3.1.0 en Vercel + MongoDB Atlas
Jonatan Emanuel Uribio · Grupo 34 · Actualización 15/11/2026.

## Estado del paquete
Código adaptado y pruebas locales aprobadas. No se creó un cluster Atlas, no se accedió a tus cuentas y no existe una URL pública verificada en esta preparación. Para completar el despliegue se necesitan las acciones de cuenta siguientes; no compartir claves ni la URI por chat o en capturas.

## 1. Preparar la carpeta
Usar solo Version_3.0 como raíz de Vercel. Incluye app.js exportado, vercel.json, package.json, package-lock.json, public/ y views/. No publicar la carpeta general con las tres versiones como si fuera la aplicación.

Desde Version_3.0 con Node.js 22:
```powershell
npm ci
npm test
Copy-Item .env.example .env
```
Si ya tenés .env, conservarlo y editarlo; no sobrescribirlo. npm run demo sigue disponible para practicar sin Atlas: usa un replica set temporal y elimina sus datos al cerrar. No usar demo como comando del alojamiento.

## 2. Preparar Atlas
- Crear o seleccionar un proyecto y cluster en https://cloud.mongodb.com/. Elegir el nivel adecuado para tu cuenta; no se contrata ningún servicio desde este paquete.
- Crear un usuario de base de datos con readWrite sobre sumarimpacto_tp3. La cuenta web de Atlas y el usuario de base son distintos.
- En Network Access / IP Access List, autorizar tu IP actual para el seed desde PC y la salida de red del alojamiento. Si tu plan de Vercel no permite salida fija y usás temporalmente 0.0.0.0/0 para la demostración, eso permite conexiones desde cualquier IP: usar un usuario restringido y contraseña fuerte y retirarlo al finalizar. Para un uso estable, definir salida fija o conectividad privada según las opciones de tus planes.
- Connect → Drivers → Node.js: copiar la URI. Reemplazar usuario, clave y nombre de base. Codificar caracteres reservados de la contraseña. Conservar las opciones de Atlas. Usar la misma base en el seed y en Vercel.
- Guardar la URI solo en .env local o secretos de Vercel. Atlas admite las transacciones que necesita esta versión; MongoDB local standalone no las admite.

## 3. Crear el administrador en Atlas desde tu PC
Configurar .env con MONGODB_URI de Atlas, ADMIN_EMAIL y ADMIN_PASSWORD (12 o más caracteres, sin CAMBIAR). Generar el secreto:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Guardar ese valor en JWT_SECRET. Para probar desde PC: NODE_ENV=development y APP_ORIGIN=http://localhost:3000.
```powershell
npm run seed
npm start
```
El seed no borra datos: crea administrador solo si no existe y ejemplos únicamente si no hay organizaciones. Probar login, un gasto y /health. Ctrl+C detiene el servidor. Con Atlas los datos persisten. No volver a usar demo para comprobar esos mismos datos: demo crea otra base temporal.

## 4. Crear o vincular el proyecto de Vercel
Dos caminos posibles:
- GitHub: subir Version_3.0 al repositorio previsto y en https://vercel.com/new importar ese repositorio. Si se subió todo el paquete, Root Directory = Version_3.0. Si se subió solo el código actual, Root Directory = raíz. Framework: Express/detección automática. Node.js 22. No indicar salida dist ni build de frontend.
- CLI desde Version_3.0:
```powershell
npx vercel login
npx vercel link
```
Responder las preguntas con tu cuenta y proyecto. Estos comandos requieren tu autenticación. La configuración incluida usa npm ci --omit=dev para instalar solo dependencias de ejecución. Las vistas se incluyen explícitamente y los recursos estáticos se sirven desde public/.

## 5. Variables de Vercel
En Settings → Environment Variables configurar para Production:

| Variable | Valor |
|---|---|
| MONGODB_URI | URI completa de Atlas con base sumarimpacto_tp3 |
| JWT_SECRET | Secreto aleatorio de 32 caracteres o más |
| APP_ORIGIN | Origen HTTPS definitivo de Settings → Domains, sin barra final |
| CONTACT_EMAIL | Correo real, opcional |
| CONTACT_PHONE | Teléfono real, opcional |
| CONTACT_HOURS | Horario real, opcional |

NODE_ENV=production es provisto por el entorno de producción de Vercel. No cargar ADMIN_PASSWORD ni ADMIN_EMAIL al alojamiento si el administrador ya fue creado localmente en Atlas. PORT no se configura para Functions. Si usás Preview, definir sus variables y su origen exacto; el origen de producción no autoriza automáticamente otros dominios.

Podés cargar variables por CLI de forma interactiva, sin pegarlas en el chat:
```powershell
npx vercel env add MONGODB_URI production
npx vercel env add JWT_SECRET production
npx vercel env add APP_ORIGIN production
npx vercel --prod
```
No incluir valores secretos en argumentos ni subir .env al repositorio. Si cambian las variables, redeploy para que se apliquen.

## 6. Comprobar la URL final
1. Abrir la URL HTTPS definitiva. La página y el chat pueden abrir aun si falta base; eso solo no demuestra un despliegue completo.
2. Abrir /health: debe devolver 200, estado ok y versión 3.1.0. Un 503 exige revisar URI, acceso de red y entorno.
3. Iniciar sesión con el administrador creado en Atlas. Probar crear proyecto, registrar aporte y gasto, y rechazar un gasto superior al saldo.
4. Reiniciar/redeploy y verificar que permanecen los datos. Mostrar la colección de Atlas sin revelar credenciales.
5. Probar chatbot, estilos, cierre de sesión y permisos. Si login devuelve Origen no permitido, comparar APP_ORIGIN con la dirección exacta abierta.
6. Si el profesor ve una pantalla de acceso de Vercel antes de la aplicación, revisar Deployment Protection y el acceso a producción; usar el dominio de producción previsto para la entrega.
7. Completar docs/ENLACES_ENTREGA.md con URL, repositorio actualizado, video y Drive. Regenerar el PDF según README.

## Problemas frecuentes
- 503 en /health: falta configuración, usuario, clave, IP autorizada o conectividad con Atlas. No publicar logs que contengan credenciales.
- Mensaje sobre transaction numbers/replica set: se está usando MongoDB standalone. Usar Atlas o un replica set; no agregar una opción para desactivar la protección.
- Vistas no encontradas: verificar raíz y vercel.json; no excluir views/.
- Página sin estilos: public/ debe estar dentro de la raíz. Vercel sirve ese directorio por CDN.
- No aparece el administrador: comprobar que seed y Vercel apuntan al mismo nombre de base.
- Login funciona solo en un dominio: APP_ORIGIN debe coincidir. Cookie Secure necesita HTTPS en producción.

## Decisiones para defender
app.js exporta Express sin abrir un listener en Vercel. Antes de login/API/health se abre o reutiliza una conexión Mongoose con pool máximo de cinco conexiones por instancia, espera de selección de ocho segundos e inactividad de diez segundos. Una promesa compartida evita conexiones duplicadas durante el mismo arranque. La página y FAQ no necesitan MongoDB.

Los cambios de donaciones, gastos y borrado de proyectos se ejecutan dentro de connection.transaction. Una escritura sobre ControlFinanciero con _id movimientos provoca conflicto entre transacciones concurrentes en distintos procesos; el driver reintenta las que tienen un conflicto transitorio. Lectura de saldo y escritura de gasto pertenecen a la misma transacción. Si falla validación o saldo, se revierte todo. Se responde HTTP después del commit, nunca dentro del callback que puede reintentarse. Las consultas de una sesión se hacen secuencialmente.

Este documento compartido es deliberadamente sencillo y serializa escrituras financieras: no se presenta como una solución de alto rendimiento. No protege escrituras directas externas ni convierte el sistema en contabilidad formal. Las limitaciones de tasa de login/chat siguen siendo por instancia, no un límite distribuido. Para un servicio real se requieren auditoría, monitoreo y controles adicionales.

## Fuentes técnicas consultadas
- https://vercel.com/docs/frameworks/backend/express
- https://mongoosejs.com/docs/8.x/docs/transactions.html
- https://www.mongodb.com/docs/atlas/connect-to-database-deployment/
- https://www.mongodb.com/docs/drivers/node/current/crud/transactions/
- Esquema vigente de configuración: https://openapi.vercel.sh/vercel.json
