# SumarImpacto · Tercera entrega
Desarrollo Web Backend · IFTS 29 · Comisión 2C · Grupo 34  
Docente según devolución del campus: Emir Eliezer García Ontiveros  
Estudiante: Jonatan Emanuel Uribio · 14/11/2026

## 1. Introducción y objetivos
La organización necesita conocer quién aporta, qué proyecto recibe los fondos y en qué se gastan. El sistema centraliza organizaciones, donantes, proyectos, donaciones y gastos. El objetivo es mantener un saldo comprensible, impedir egresos superiores a lo recibido y consultar el historial. Se integran Node.js, Express, MongoDB, Mongoose y MVC, con acceso controlado y una interfaz de apoyo.

La primera entrega se enfocó en las bases de la materia mediante personas y archivo JSON. No implementaba SumarImpacto. La segunda cambió al caso de donaciones y gastos e incorporó Mongoose. La tercera continúa ese repositorio, amplía seguridad y usabilidad y hace explícitas las decisiones de negocio. No se presenta una conversión automática de las personas de la primera entrega en donantes.

Objetivos específicos: conservar rutas dinámicas y asincronía; separar configuración, rutas, controladores y modelos; persistir relaciones mediante ObjectId; aplicar autenticación y autorización; validar entradas; probar operaciones críticas y documentar la evolución. No se incorpora complejidad sin una función concreta para la consigna.

## 2. Alcance y usuarios
Administrador: consulta y registra entidades y movimientos, edita donaciones permitidas y elimina proyectos vacíos. Operador: consulta, crea registros y edita proyectos; no elimina ni corrige donaciones. Consulta: solo lectura. Visitante: página de acceso y asistente guiado. Los roles son técnicos y no representan un portal de autogestión del donante.

El sistema registra aportes ya recibidos, no procesa pagos. No incluye transferencias entre proyectos, borrado de movimientos, auditoría legal, emisión de comprobantes fiscales, mensajería humana, notificaciones ni contabilidad formal. No se afirma equivalencia con el prototipo desarrollado en Ingeniería de Software: se reutilizan conceptos de RF/RNF, no todas sus funciones. La meta del proyecto no representa saldo real.

## 3. Requerimientos funcionales y trazabilidad
| ID | Requerimiento verificable | Implementación / aceptación |
|---|---|---|
| RF01 | Iniciar y cerrar sesión | authController; 200 con credenciales, 401 incorrectas |
| RF02 | Restringir acciones por rol | middleware/auth; consulta no crea, operador no borra: 403 |
| RF03 | Registrar/listar organizaciones y donantes | impactoController, modelos y formularios; 201 y GET |
| RF04 | CRUD y filtro de proyectos | rutas /proyectos/:id; referencias válidas, baja solo sin movimientos |
| RF05 | Registrar donaciones con proyecto opcional | POST /donaciones; monto válido y donante existente |
| RF06 | Registrar gastos con saldo suficiente | POST /gastos; 201 si alcanza, 400 si excede |
| RF07 | Consultar saldo e historial por proyecto | GET saldo/donaciones/gastos; 50 menos 30 igual 20 |
| RF08 | Corregir una donación permitida | PUT /donaciones/:id; bloqueada si origen tiene gastos |
| RF09 | Mostrar totales sin confundir fondos | /resumen separa recibido, asignado, sin asignar y gastos |
| RF10 | Orientar sobre donaciones y contacto | /chat público responde por reglas y no pide datos bancarios |

## 4. Requerimientos no funcionales
| ID | Criterio | Verificación / límite |
|---|---|---|
| RNF01 Seguridad | Contraseñas derivadas, secreto externo y control de permisos | scrypt, JWT, roles, .gitignore; no claves en repo |
| RNF02 Consistencia | No sobregiro por gastos concurrentes entre procesos que usan la misma base | Prueba de dos procesos y gastos de 70 sobre saldo 100: 201 y 400 |
| RNF03 Mantenibilidad | MVC, funciones claras y configuración separada | Rutas, controladores, modelos, config y middleware |
| RNF04 Usabilidad | Formularios, mensajes y separación visual de saldos | HTML con labels y status; revisión visual final en navegador del estudiante |
| RNF05 Persistencia | Guardar registros y relaciones en MongoDB | Integración temporal comprobada; persistencia tras reinicio/Atlas pendiente |
| RNF06 Configuración | Mismo código acepta URI local o Atlas y PORT del proveedor | .env.example y DESPLIEGUE.md; remoto pendiente |
| RNF07 Rendimiento de alcance | async/await, consultas paralelas independientes y JSON 16 KB | Sin benchmark ni promesa de latencia; listados sin paginación |
| RNF08 Observabilidad | Registro de método/ruta y respuesta de salud | registrarPeticion; /health indica disponibilidad DB |

## 5. Reglas de negocio con ejemplos
RN01: las relaciones deben existir. Un proyecto exige una organización; una donación un donante; un gasto un proyecto. La base no posee claves foráneas relacionales automáticas: el controlador busca referencias antes de escribir. Un ObjectId válido sin documento retorna 404 y uno mal formado, 400.

RN02: los movimientos aceptan monto JSON numérico entre 1 y 1.000.000.000, con hasta dos decimales. Monto 0, -5, 1.001 o string «10» se rechaza con 400. Es una decisión del alcance heredado conservar mínimo 1 ARS. Los totales de proyecto suman centavos redondeados y luego convierten a pesos; no se utiliza el objetivo como si fuera dinero recibido.

RN03: las donaciones sin proyecto integran el total recibido global, pero no un saldo particular. Ejemplo inicial: aporte de 10.000 al proyecto y 2.000 sin asignar: recibido 12.000, asignado 10.000, sin asignar 2.000. Si se gasta 4.000, saldo proyectos 6.000 y saldo global 8.000. Fórmulas: recibido = asignado + sin asignar; saldo global = recibido − gastos.

RN04: un gasto exige saldo suficiente. Una donación de 50 y un gasto de 30 dejan 20. Un nuevo gasto de 25 retorna 400 y conserva los registros anteriores. No se crean gastos negativos para simular devoluciones.

RN05: se conserva historial. Un proyecto con donaciones o gastos no se puede eliminar; uno vacío sí. Los movimientos no tienen endpoint de borrado. La UI no es la protección: el servidor aplica la misma regla aunque se use Postman.

RN06: una donación no se modifica si su proyecto de origen ya tiene gastos. Se conserva la interpretación conservadora de V2 porque el modelo no identifica qué aporte financió cada gasto. Admin puede corregir una donación de proyecto sin gastos o asignar un aporte que estaba sin proyecto. El destino debe existir.

RN07: desde 3.1.0 las altas y ediciones de donaciones, altas de gastos y bajas de proyectos se coordinan mediante transacciones en MongoDB. Cada transacción escribe el documento interno ControlFinanciero antes de verificar referencias y saldo. Los conflictos entre procesos se reintentan por el driver. El gasto se confirma junto con su validación; un error revierte las escrituras. Se responde HTTP solo al confirmar. Requiere Atlas o replica set y no cubre escrituras externas directas. Es una coordinación global sencilla, no una promesa de alto rendimiento.

RN08: las actualizaciones usan listas de campos permitidos y runValidators. Un cuerpo con $set o campos ajenos retorna 400. Se rechazan cuerpos vacíos; Mongoose vuelve a validar campos obligatorios, formato de email, fechas, tipos y montos. El esquema es estricto en las entidades del caso.

## 6. Arquitectura, controladores y validaciones
MVC organiza responsabilidades: modelos describen datos, vistas Pug generan HTML y controladores procesan HTTP. El JavaScript de navegador consume la API mediante fetch; nunca conecta a MongoDB. app.js inicia solo tras conectar la base y exige un JWT_SECRET configurado para el inicio persistente.

Orden relevante de middleware: Helmet; logger; parser JSON con límite; cookie-parser; comprobación de origen y formato; estáticos; rutas públicas; autenticación de API; autorización; controladores; 404 y manejador de errores. El control de rol se ejecuta antes de las acciones. Los mensajes de error no entregan stack al cliente.

impactoController: crearDonante/crearOrganizacion validan allowlist y guardan modelos. crearProyecto comprueba organización; actualizarProyecto permite nombre, descripción, organización y objetivo con validación activa. eliminarProyecto entra a la transacción, busca movimientos y elimina solo si no encuentra ninguno. registrarDonacion valida donante, proyecto opcional y monto. actualizarDonacion consulta primero los gastos del origen y aplica RN06. registrarGasto valida monto, referencia y saldo antes de crear. consultarSaldo usa agregaciones; listarDonaciones/listarGastos usa populate para presentar nombres. resumen calcula recibido, asignado y sin asignar separadamente.

Dos niveles: el controlador comprueba la solicitud y el negocio (permisos, referencias, saldo); Mongoose valida la estructura persistente (required, tipos, min/max, email). La validación HTML ayuda al usuario, pero puede omitirse mediante HTTP y por eso no reemplaza ninguna validación del servidor. Los modelos representan relaciones con ObjectId y ref; el saldo se calcula y no se duplica como campo editable.

Autenticación: authController comprueba credenciales y scrypt compara hashes con timingSafeEqual. Crea JWT HS256 con issuer, expiración de dos horas y subject del usuario. Middleware verifica firma y lee el usuario/rol actual de MongoDB. JWT se guarda en cookie HttpOnly, Strict y Secure en producción. No se usa Passport ni sesiones de servidor porque JWT ya cumple el requisito y añadir alternativas duplicaría mecanismos. Logout borra cookie, pero no revoca tokens robados; expiran a las dos horas.

El chatbot usa una base editable de 29 temas sobre texto normalizado, con preguntas de aclaración y sugerencias. No es un modelo generativo, no utiliza una API de IA y conserva solo el último tema en memoria del navegador, sin guardar historial en MongoDB. Sus respuestas orientan sin modificar movimientos. CONTACT_EMAIL, CONTACT_PHONE y CONTACT_HOURS permiten mostrar canales reales; si falta, explica que no fue configurado. No recolecta datos de pago ni envía emails.

## 7. Modelo de datos y diagramas
Organización (nombre, descripción, contacto) tiene muchos Proyectos (nombre, descripción, organización y objetivo). Donante (nombre, email, teléfono) tiene muchas Donaciones (donante, proyecto opcional, monto, fecha). Proyecto tiene muchos Gastos (proyecto, concepto, monto, fecha). Usuario contiene nombre, email único, passwordHash y rol. Todas las entidades guardan timestamps.

Las relaciones y los diagramas de casos de uso y secuencia se incluyen en DIAGRAMAS.md. Usuario habilita operaciones pero no queda vinculado como autor de cada movimiento: no existe auditoría por usuario en esta versión.

## 8. Mantenimiento y evolución de entregas
V1 resolvió la práctica inicial con personas, MVC, Pug y JSON. V2 adoptó el caso SumarImpacto y MongoDB/Mongoose. V3 preserva esas entidades, endurece la entrada, agrega autenticación y roles, diferencia totales y amplía la interfaz. Se retiran de la carpeta activa JsonDAO y los JSON históricos de entidades porque ya no participan de la persistencia; permanecen en la copia histórica V2. En 3.0.1, data/ contiene únicamente el catálogo de FAQ, no movimientos ni datos financieros.

La devolución de la segunda entrega pedía reglas más desarrolladas, detalle de controladores y validaciones, cámara y comprensión de arquitectura. Esta documentación responde a los tres primeros aspectos técnicos con ejemplos y trazabilidad. La cámara y la explicación personal deben comprobarse en el video final; no se consideran corregidas por escribir este documento.

Matriz completa en MATRIZ_VERSIONES.md. No se inventan commits ni aportes de terceros en la tercera entrega. Las copias históricas registran commits recuperados; no son garantía de que coincidan exactamente con el momento original de la entrega.

## 9. Pruebas y resultados
Se ejecutó npm test con Node 24.22.1, Supertest y MongoDB Memory Server. La suite actual tiene 48 pruebas aprobadas y 0 fallidas: 43 del asistente, una integral HTTP, una de dos procesos financieros y tres de preparación para Vercel. No se cuenta cada aserción HTTP como un test independiente. Archivo de salida real: RESULTADOS_PRUEBAS.txt. La base temporal se destruye al finalizar y no usa las credenciales de Atlas.

Incluye: CRUD de proyectos, organizaciones y donantes; referencias faltantes y mal formadas; filtro; donación con/sin proyecto; saldo; gasto permitido y sobregiro rechazado; bloqueo de edición y borrado; dos gastos simultáneos; allowlist; tipos y precisión; login incorrecto y correcto; roles; cierre de sesión; chatbot y salud; origen ajeno y JSON malformado. PRUEBAS.md detalla el procedimiento manual y los estados esperados. La colección Postman guarda automáticamente IDs al crear registros.

También se verificó el JavaScript de interfaz con DOM simulado y API real: login, seis indicadores, cinco pestañas, alta de gasto, rechazo de sobregiro y chatbot, sin errores JavaScript. Ver RESULTADOS_INTERFAZ.txt. Esta comprobación no evalúa layout. La prueba de API y renderizado HTML no demuestra por sí sola la visualización en todos los dispositivos. Quedan por ejecutar con la cuenta del estudiante: comprobación de Atlas, persistencia tras reinicio, despliegue HTTPS, permisos de enlaces y grabación. No se fabrican capturas de Postman ni evidencias de producción.

## 10. Responsabilidad individual y planificación
Responsable de la tercera entrega: Jonatan Emanuel Uribio. Alcance a su cargo: integrar la versión final, revisar el código y las reglas, configurar Atlas/despliegue, ejecutar y mostrar pruebas, completar enlaces y realizar la defensa. Se declara uso de asistencia de IA para la preparación; no se atribuye a la persona una revisión o grabación que todavía no realizó.

Plan de cierre sugerido (estimación, no registro de horas trabajadas): revisión y ejecución local 45 minutos; inspección de reglas y pruebas 45 minutos; Atlas y despliegue 60–90 minutos; completar enlaces y PDF 20 minutos; ensayo y grabación 30–45 minutos. Prioridad alta: consistencia, acceso, pruebas y enlaces. Prioridad media: recorrido visual y ensayo. El chatbot ya está implementado como complemento limitado.

## 11. Uso de IA, decisiones y límites
Se utilizó ChatGPT para analizar consignas, recuperar y ampliar el código, construir pruebas y preparar documentación. El material se adaptó al repositorio real y se verificó mediante integración automatizada. Jonatan debe estudiar y validar lo entregado antes de atribuirse decisiones y defenderlo.

Se conserva Pug y CommonJS para continuidad de cátedra. No se añaden React, pagos, microservicios ni un proveedor de chat generativo. JWT, cookie-parser, Helmet y express-rate-limit se justifican por autenticación, transporte del token, cabeceras y protección básica ante abusos. scrypt pertenece a Node, evita una dependencia adicional para contraseñas.

Limitaciones explícitas: coordinación financiera global que limita el rendimiento; sin auditoría por autor; JWT sin revocación inmediata; listados completos sin paginación; datos de ejemplo ficticios; ninguna pasarela; publicación y Atlas pendientes. Estas decisiones no se presentan como una plataforma lista para fondos reales.

## 12. Conclusión para personalizar antes de grabar
Aprendizaje que puede demostrarse con el código: pasar de CRUD y JSON a una API modular con MongoDB, diferenciar validación de estructura y regla de negocio y controlar permisos en el servidor. Dificultad técnica documentada: conservar consistencia entre donaciones y gastos y explicar fondos sin asignar; se resuelve con fórmulas separadas, referencias y transacciones coordinadas en MongoDB. Tema para reforzar: pruebas, despliegue y monitoreo de transacciones entre instancias. Jonatan debe expresar con sus propias palabras qué aprendió, qué le interesó más y qué dificultades experimentó personalmente.

## 13. Bibliografía y material base
Documentos efectivamente aportados: DSWB_2A_CasoPersonas_2C26 (1).pdf; DSWB_2C_SumarImpacto_2C26 (1).pdf; 3° Parcial - IFST 29 - Para todos los casos (1).pdf; captura de devolución de segunda entrega; texto de publicación del campus. Se consultaron los repositorios enlazados en los documentos. No se afirma acceso a las unidades de cátedra mencionadas en aquellos PDF, cuyos archivos no fueron aportados.

Referencias técnicas: Node.js crypto (https://nodejs.org/api/crypto.html); Express 5 error handling (https://expressjs.com/en/5x/guide/error-handling/); Mongoose 8 validation (https://mongoosejs.com/docs/8.x/docs/validation.html); MongoDB Atlas connect (https://www.mongodb.com/docs/atlas/connect-to-database-deployment/); Pug (https://pugjs.org/api/getting-started.html); jsonwebtoken (https://github.com/auth0/node-jsonwebtoken); Helmet (https://helmetjs.github.io/); express-rate-limit (https://express-rate-limit.mintlify.app/). Material técnico verificado/identificado durante la preparación del 14/11/2026. Las versiones exactas instaladas constan en package-lock.json.

## 14. Enlaces y condiciones de entrega
Los accesos y su estado se concentran en el anexo «Documento principal de entrega», generado desde ENLACES_ENTREGA.md. Actualizar ese archivo y regenerar el PDF al completar la publicación y el video.

Este PDF es documentación técnica preparada para completar con evidencias y enlaces definitivos. No debe enviarse con pendientes. Cada estudiante debe aparecer en cámara según consigna; en esta tercera entrega la defensa es individual. La publicación del campus solicita enlace individual y en oficinas, mientras el PDF adjunto también menciona ZIP/RAR y versiones anteriores. Se incluye ZIP con versiones separadas; confirmar el mecanismo habilitado en el aula y añadir el mismo enlace de Drive, con accesos, al espacio de entrega y al foro. Cierre indicado por el campus: domingo 15/11/2026, 23:58.

## 15. Actualización del asistente · 15/11/2026
Se amplió el chatbot a 29 temas con respuestas revisadas, variantes de consulta, seguimiento del último tema y aclaraciones de acciones ambiguas. Se separó conocimiento de lógica, se añadieron sugerencias, espera, protección de doble envío y reinicio. No consulta saldos privados ni procesa pagos. Se corrigió también el argumento Unix para Windows en demo/tests. Detalle en CHATBOT.md y evidencia actualizada en RESULTADOS_PRUEBAS.txt.

## 16. Preparación para Vercel · versión 3.1.0
Se agregó vercel.json, conexión Mongoose diferida y reutilizable, validación de configuración y persistencia transaccional entre procesos. Los cambios superan la cola local de 3.0/3.0.1 y se justifican por el escalado automático del alojamiento. El modelo interno ControlFinanciero no representa un fondo ni duplica saldos: solo coordina escrituras. Las instrucciones completas y fuentes figuran en VERCEL_ATLAS.md. Código preparado y pruebas locales completadas; publicación, cluster de cuenta y URL remota siguen pendientes.
