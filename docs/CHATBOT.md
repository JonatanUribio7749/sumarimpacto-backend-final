# Asistente de preguntas frecuentes · actualización 3.0.1
Fecha: 15/11/2026 · Jonatan Emanuel Uribio · Grupo 34.

## Funcionamiento
La base editable `data/preguntasFrecuentes.json` contiene 29 temas, respuestas y patrones de intención. `services/chatService.js` normaliza acentos, mayúsculas y puntuación, aplica reglas específicas antes de generales y elige una respuesta revisada. `controllers/chatController.js` valida el cuerpo HTTP: mensaje de 1 a 500 caracteres y tema anterior de hasta 50. El endpoint sigue siendo POST /api/chat y mantiene el límite de solicitudes.

No es IA generativa y no necesita claves de API, Internet externo ni un servicio de pago para responder. No interpreta cualquier pregunta: cuando no reconoce el tema ofrece opciones; cuando la acción es ambigua pide distinguir proyecto, donación o gasto. Las frases comunes se prueban con tests; se pueden sumar variantes conforme surjan consultas reales.

El navegador guarda únicamente el último identificador de tema en memoria, y lo envía como `contexto`. No se envía todo el historial ni se guarda conversación en MongoDB. Recargar o usar Reiniciar conversación limpia ese contexto. El servidor solo utiliza temas presentes en su propia base; no ejecuta instrucciones incluidas en el contexto del cliente.

La interfaz agrega sugerencias relacionadas, indicador de espera, bloqueo de envíos duplicados y botón para reiniciar. Los textos del usuario y respuestas se insertan mediante textContent, no HTML. El chat no registra donaciones, no confirma pagos y no muestra datos personales ni saldos privados. Si se solicita un importe actual, orienta al panel protegido; los ejemplos se identifican como tales.

## Contacto real
Configurar en `.env` o en las variables del alojamiento y reiniciar el proceso:

```env
CONTACT_EMAIL=
CONTACT_PHONE=
CONTACT_HOURS=
```

Completar únicamente los canales reales. No se proporcionaron estos datos: se mantienen vacíos. Si no hay ninguno, el asistente explica que el canal no está habilitado y orienta a consultar al responsable; no inventa email, teléfono, CBU ni alias. En modo demo también se leen estas variables desde `.env`; no hace falta configurar MongoDB persistente solo para mostrar contacto.

## Catálogo de temas
| Tema | Qué responde |
|---|---|
| Contacto | Canales configurados y respuesta honesta si faltan. |
| Donar sin proyecto | Sí. Un aporte puede registrarse con donante y monto, sin elegir proyecto. Integra el total recibido y los fondos sin asignar, pero no aumenta el saldo de ningún proyecto. Para asignarlo después, un administrador edita la donación y elige un proyecto existente. |
| Corregir una donación | Solo el administrador puede corregir una donación. En Donaciones, elegí Editar donación. Si el proyecto de origen ya tiene gastos, la modificación se bloquea para conservar la consistencia del historial. Si no tiene gastos, se pueden corregir sus campos válidos. |
| Eliminar un proyecto | Solo el administrador puede eliminar un proyecto y únicamente cuando no tiene donaciones ni gastos asociados. En Proyectos, elegí Eliminar. Si ya tiene movimientos, el sistema conserva el proyecto y rechaza la baja. |
| Historial de movimientos | Esta versión no permite borrar movimientos, anular gastos ni procesar reembolsos. Conserva el historial. Una donación solo puede corregirse bajo la regla de edición; no registres importes negativos para simular una devolución. |
| Gasto rechazado | Revisá: 1) el proyecto seleccionado existe; 2) el monto es numérico, desde 1 ARS y con hasta dos decimales; 3) el saldo alcanza; 4) tu rol es admin u operador. Si quedan 20 ARS y pedís gastar 25, la API responde 400 sin guardar el gasto. Un rol de consulta recibe 403. |
| Registrar un gasto | Iniciá sesión con rol admin u operador. Abrí Gastos, elegí un proyecto, escribí el concepto y el monto, y presioná Guardar. El servidor verifica saldo suficiente antes de persistir. Después revisá Saldo y movimientos del proyecto. |
| Registrar una donación | Con sesión de admin u operador: 1) creá o identificá al donante; 2) abrí Donaciones; 3) elegí donante y, opcionalmente, proyecto; 4) ingresá monto y guardá. Es el registro administrativo de un aporte recibido: este formulario no cobra dinero. |
| Entender los totales | Total recibido = aportes asignados + aportes sin asignar. Saldo de proyectos = asignado − gastos. Saldo global = recibido − gastos. Ejemplo: 12.000 recibidos, 10.000 asignados y 2.000 sin asignar; con gastos de 4.000 quedan 6.000 en proyectos y 8.000 globales. La meta del proyecto no es dinero recibido. |
| Montos y moneda | Los movimientos se registran en pesos argentinos (ARS). El monto debe ser un número entre 1 y 1.000.000.000, con hasta dos decimales. En JSON enviá un número, no un texto. No se admiten cero, negativos ni más de dos decimales. |
| Medios de pago | La aplicación no integra tarjetas, Mercado Pago ni transferencias. No hay un alias o CBU configurado para cobrar. Coordiná el aporte por un canal real de la organización y el personal autorizado podrá registrarlo después. No compartas datos bancarios ni claves en este chat. |
| Comprobantes | El historial muestra fecha, monto y proyecto de cada movimiento, pero esta versión no emite comprobantes fiscales ni permite adjuntar recibos. Si necesitás un comprobante del aporte, solicitá al responsable de la organización el documento que corresponda. |
| Destino de los fondos | Un usuario autorizado puede abrir Proyectos → Saldo y movimientos para consultar donaciones, gastos y saldo. Los gastos tienen concepto, monto y fecha. Un aporte sin proyecto figura en el resumen global como sin asignar. Este chat no muestra datos personales de donantes. |
| Roles y permisos | Admin: consulta, registra entidades y movimientos, edita proyectos y corrige donaciones permitidas o elimina proyectos vacíos. Operador: consulta, registra y edita proyectos, pero no elimina ni corrige donaciones. Consulta: solo lectura. Los permisos se aplican en el servidor, no únicamente en los botones. |
| Acceso al sistema | Usá el formulario Ingresar al panel con tu email y contraseña. En npm run demo, la terminal muestra una clave aleatoria nueva en cada inicio. En modo persistente usás el administrador creado con npm run seed. No hay registro público ni recuperación de contraseña por correo en esta versión. Nunca escribas tu clave en este chat. |
| Guardado de datos | Con npm run demo se utiliza una base MongoDB temporal: los datos se eliminan al cerrar. Para conservarlos, configurá MONGODB_URI con MongoDB local o Atlas y usá npm run seed una vez y npm start. No uses la demo para registros que necesites conservar. |
| Crear un proyecto | Con rol admin u operador, registrá primero una organización. Luego abrí Proyectos e ingresá nombre, descripción, organización y objetivo en ARS. Guardá el registro. El objetivo es una meta; el saldo aumenta únicamente cuando se registran donaciones asignadas. |
| Organizaciones | Una organización agrupa proyectos. Para registrarla, un admin u operador abre Organizaciones y completa nombre, descripción y contacto. Cada proyecto debe relacionarse con una organización existente. Esta versión permite crear y listar organizaciones; no tiene edición ni baja de ellas. |
| Donantes | Para registrar una donación se necesita un donante existente. En Donantes, admin u operador completa nombre y email válido; el teléfono es opcional. No hay una modalidad anónima ni un portal público de autogestión del donante en esta versión. No escribas información personal en el chat. |
| Otras formas de colaborar | Esta versión registra aportes monetarios y gastos. No administra inventarios de ropa, alimentos u otras donaciones en especie ni inscripciones de voluntariado. Podés consultar al responsable de la organización si recibe esas colaboraciones fuera del sistema. |
| Seguridad y privacidad | El panel requiere sesión y permisos. Las contraseñas se guardan derivadas con scrypt, no como texto; el acceso usa JWT en cookie HttpOnly. Este asistente no solicita claves ni datos de pago y no guarda el historial de conversación en la base. Se envía únicamente la consulta y el tema anterior para responder. Es un proyecto académico; no una plataforma para operar fondos reales. |
| Pruebas del sistema | Desde Version_3.0 ejecutá npm test. Se usa MongoDB temporal aislado para verificar API, referencias, saldo, concurrencia, sesión y permisos, sin modificar la base de trabajo. docs/SumarImpacto_Postman.json contiene el recorrido manual y guarda IDs al ejecutar los pasos en orden. |
| Temas de ayuda | Puedo orientarte para donar, contactar a la organización, registrar movimientos y entender saldos, permisos o errores. Elegí una sugerencia. Las respuestas provienen de preguntas frecuentes revisadas: no soy una persona ni un servicio de pagos. |
| Sobre SumarImpacto | SumarImpacto es un proyecto académico para registrar donaciones y gastos de proyectos sociales. Relaciona organizaciones, proyectos, donantes y movimientos para conocer el destino de los aportes y el saldo disponible. Soy su asistente automático de preguntas frecuentes. |
| Saludo | ¡Hola! Soy el asistente de SumarImpacto. ¿Querés colaborar o necesitás ayuda con el panel? Puedo explicarte donaciones, proyectos, saldos, contacto y permisos. |
| Cierre | ¡De nada! Si necesitás otra orientación, elegí una sugerencia o escribí tu consulta. |
| Saldo de un proyecto | El saldo de un proyecto es la suma de sus donaciones asignadas menos sus gastos. Para ver un importe real, iniciá sesión y abrí Proyectos → Saldo y movimientos. No confundo el objetivo con dinero recibido ni invento cifras actuales. |
| Consultar proyectos | Cada proyecto pertenece a una organización y tiene nombre, descripción y meta. Con sesión iniciada podés consultarlos en Proyectos, filtrar por organización y abrir Saldo y movimientos. Sin sesión no se muestran registros privados. |
| Cómo colaborar | Para colaborar, coordiná el aporte con el responsable de la organización y elegí si querés destinarlo a un proyecto. Después, el personal autorizado registra la donación con un donante existente y monto. También se pueden registrar aportes sin proyecto. Esta aplicación no cobra ni solicita datos bancarios. |

## Ejemplos de conversación
- «Hola, quiero donar» → orientación para colaborar.
- «¿Y sin elegir uno?» después de donar → explica aportes sin proyecto.
- «¿Cómo registro una donación?» → pasos del panel, distingue registro de cobro.
- «¿Puedo cambiarla?» después del registro → reglas de edición.
- «No me deja registrar un gasto» → saldo, monto, referencia y permisos.
- «Quiero modificar algo» → pide precisar qué entidad.
- «¿Cómo me contacto con uds?» → canales reales o explicación si faltan.

## Verificación
Resultado actual: 48 pruebas aprobadas, 0 fallidas. Incluye 40 preguntas con intención esperada, contexto, contacto configurado/no configurado y límites de respuesta, además de la integración HTTP financiera previa. RESULTADOS_PRUEBAS.txt conserva la salida real. La comprobación de interfaz con DOM simulado y API real también verificó sugerencias, continuación y reinicio; no acredita revisión visual en todos los navegadores.

Se corrigió el arranque del MongoDB temporal: Windows no recibe --nounixsocket. Linux/macOS conservan esa opción. No se modifican colecciones ni reglas financieras por esta actualización. La funcionalidad de chatbot queda acotada a orientación y FAQ; no usa el modelo como fuente de saldos actuales.

La versión 3.1.0 conserva las FAQ y agrega pruebas/configuración de Vercel y transacciones. Persistencia local requiere replica set; Atlas es la opción remota documentada.
