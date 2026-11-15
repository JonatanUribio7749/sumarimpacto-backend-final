# Evolución y matriz de tecnologías · Grupo 34
Tercera entrega: Jonatan Emanuel Uribio. Fecha de preparación: 14/11/2026.

La entrega 1 cumplió las bases de la materia con gestión de personas. No era una implementación de SumarImpacto. La entrega 2 adoptó el caso 5, con donaciones y gastos; por eso no se presenta como una migración de personas a donantes ni se importan esos datos. La tercera continúa el código real de SumarImpacto.

| Aspecto | Entrega 1 / versión documental 1.0 | Entrega 2 / versión documental 2.0 | Entrega 3 / versión 3.0 |
|---|---|---|---|
| Caso | Gestión de personas | SumarImpacto | SumarImpacto ampliado |
| Node.js / Express | API REST y rutas dinámicas | API del caso social | Se conservan y protegen |
| MVC / Pug | CRUD web de personas | Vista básica de proyectos | Panel con formularios y detalle |
| Persistencia | Archivo JSON | MongoDB + Mongoose | MongoDB local o Atlas por entorno |
| Entidades | Persona | Organización, Donante, Proyecto, Donación, Gasto | Las cinco más Usuario |
| Asincronía | Lectura/escritura async | Consultas async/await | Conservada en consultas y autenticación |
| Middleware | Registro, JSON, errores | Registro y errores centrales | JWT, roles, origen, límites, Helmet |
| Seguridad de acceso | Sin login | Sin login | JWT en cookie HttpOnly, hash scrypt |
| Reglas | ID, nombre, apellido | Saldo y referencias | Reglas conservadas, allowlist, centavos |
| Pruebas | CRUD y persistencia JSON | Finanzas y concurrencia | Regresión + roles, sesión, entradas y chat |
| Ayuda | Sin chatbot | Sin chatbot | Asistente por reglas sin API externa |
| Publicación | Ejecución local | Ejecución local documentada | Preparación para despliegue; pendiente verificar URL y Atlas |
| Documentación | Bases y personas | Modelo y API | RF/RNF, decisiones, reglas, diagramas y trazabilidad |

## Origen verificable de las copias
- V1: https://github.com/JonatanUribio7749/DSWB_2A_Grupo34GestionPersonas_2C26.git
- Commit recuperado: 1a65621eabdeb36b0794453443da0e2725fdfe92
- V2: https://github.com/JonatanUribio7749/sumarimpacto-backend.git
- Commit recuperado: eceb749597d4546d48cd66fe8f576a11fce5a671
- Las carpetas son copias de los repositorios consultados el 14/11/2026 (Argentina); no demuestran por sí solas qué commit se entregó originalmente. Los PDF aportados se conservan aparte.
- Los nombres 1.0/2.0/3.0 organizan la entrega; el package.json histórico V2 declara 1.1.0. No se altera ese dato.

## Correcciones de la devolución de segunda entrega
| Observación docente | Respuesta en tercera entrega | Evidencia para defensa |
|---|---|---|
| Faltaba explicar reglas de negocio | Reglas RN01–RN08 con ejemplos | README y DOCUMENTACION.md |
| Mayor detalle de controladores y validación | Flujo HTTP, funciones y dos niveles de validación | impactoController.js y models/ |
| Cámara y participación | Tercera entrega individual | Jonatan aparece en cámara durante toda su explicación |
| Demostrar arquitectura y justificar decisiones | MVC, JWT, Mongoose, serialización y límites | Código, diagrama y pruebas en vivo |

No se fabrican intervenciones, reuniones, commits ni resultados de pruebas de integrantes. Las responsabilidades de esta etapa son individuales; las versiones históricas conservan su autoría.

## Versiones técnicas exactas registradas
Valores de package-lock.json de las copias recuperadas. Son versiones de dependencias, diferentes de las versiones documentales de las entregas. Node no se guarda en ese lock: requisito histórico >=20; preparación probada con Node 24.22.1 y npm 11.9.0.

| Biblioteca | Entrega 1 | Entrega 2 | Entrega 3 | Función |
|---|---|---|---|---|
| express | 5.2.1 | 5.2.1 | 5.2.1 | Servidor HTTP y rutas |
| mongoose | No utilizada | 8.24.5 | 8.24.9 | ODM y validaciones |
| pug | 3.0.4 | 3.0.4 | 3.0.4 | Plantillas HTML |
| dotenv | No utilizada | 16.6.1 | 16.6.1 | Variables de entorno |
| jsonwebtoken | No utilizada | No utilizada | 9.0.3 | Firma y verificación JWT |
| helmet | No utilizada | No utilizada | 8.3.0 | Cabeceras HTTP |
| cookie-parser | No utilizada | No utilizada | 1.4.7 | Lectura de cookies |
| express-rate-limit | No utilizada | No utilizada | 8.7.4 | Límites de acceso |
| supertest | No utilizada | 7.3.1 | 7.3.1 | Pruebas HTTP |
| mongodb-memory-server | No utilizada | 10.4.3 | 10.4.3 | MongoDB temporal para pruebas/demo |

MongoDB del test: 7.0.24. Versión de cluster Atlas: pendiente de configurar, no se infiere desde Mongoose. Auditoría npm de dependencias de producción en preparación: 0 vulnerabilidades reportadas; no equivale a una auditoría completa de seguridad.

## Revisión 3.0.1 · 15/11/2026
Se conserva la arquitectura y dependencias. El asistente pasa de respuestas generales por palabras a catálogo de 29 temas con contexto mínimo, aclaraciones y sugerencias. Se adapta MongoDB temporal a Windows. La suite pasa de 1 prueba integral a 44 tests totales. Base y evidencias en CHATBOT.md y RESULTADOS_PRUEBAS.txt.

## Revisión 3.1.0 · Vercel / Atlas · 15/11/2026
Se mantiene Node/Express/Mongoose y se agrega configuración Vercel. MongoDB requiere replica set para transacciones: Atlas en despliegue, replica set temporal en demo/test. Se retira la cola de memoria del código actual y se incorpora ControlFinanciero con transacciones compartidas entre procesos. No se agregan librerías de ejecución. La suite actual tiene 48 pruebas aprobadas. Publicación remota pendiente.
