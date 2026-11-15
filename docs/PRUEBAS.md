# Plan y evidencia de pruebas
## Automatizadas ejecutadas
Comando: npm test. Base: MongoDB temporal independiente. Resultado de preparación: 48 tests aprobados, 0 fallidos: 43 del asistente, 1 integral HTTP, 1 financiera entre dos procesos y 3 de configuración/entrada para Vercel. Ver RESULTADOS_PRUEBAS.txt. No son resultados de Atlas ni de un despliegue.

| Objetivo | Procedimiento automatizado | Resultado esperado y observado |
|---|---|---|
| Acceso | GET protegido sin login y login incorrecto | 401 |
| Credenciales | Login administrador | 200 y cookie |
| Entidades | Crear organización/donante/proyecto | 201 |
| Referencias | ID inexistente y mal formado | 404 y 400 |
| Proyecto | Consultar, editar, filtrar, borrar vacío | 200 |
| Saldo | Donar 10.000, gastar 4.000, consultar | 6.000 disponibles |
| Sobregiro | Intentar gastar 7.000 de ese saldo | 400, sin escribir |
| Historial | Modificar donación con gastos y borrar proyecto | 400 |
| Donación opcional | Registrar 50 sin proyecto | Suma a recibido y sin asignar |
| Concurrencia | Saldo 100, gastos 70 simultáneos | Uno 201, otro 400; saldo 30 |
| Entrada | Campos ajenos, $set, montos inválidos y objeto en email | 400 |
| Permisos | Consulta intenta alta; operador intenta baja/corrección | 403 |
| Chat | Donar, saldo, proyectos, contacto y fallback | 200; texto 501 caracteres: 400 |
| Seguridad HTTP | Origen ajeno y JSON inválido | 403 y 400 |
| Sesión | Logout y nueva consulta protegida | 200 y 401 |

## Recorrido manual para filmar (pendiente ejecutar por Jonatan)
1. Iniciar demo limpia. Tablero: recibido 12.000, asignado 10.000, sin asignar 2.000, gastos 0.
2. En Gastos, crear 4.000 para Huerta comunitaria. Esperado: saldo proyecto 6.000; saldo global 8.000.
3. Intentar gasto 7.000. Esperado: mensaje de exceso; gasto no aparece y totales no cambian.
4. Intentar editar donación de ese proyecto o borrarlo. Esperado: rechazo.
5. Crear proyecto vacío, editar nombre, filtrarlo y eliminarlo. Esperado: operación permitida.
6. Abrir asistente, consultar Donar y Contacto. Esperado: guía sin procesamiento de pago.
7. Cerrar sesión, probar URL protegida. Esperado: 401. Si se crean roles de prueba, mostrar 403 con consulta/operador.
8. Ejecutar npm test y mostrar salida real en terminal. Explicar que usa base aislada.
9. Para acreditar entrega final, repetir un alta con Atlas, reiniciar npm start y verificar registro persistente en panel y colección de Atlas.

Postman: importar SumarImpacto_Postman.json, editar email/clave en Variables, ejecutar solicitudes 01 a 14 en orden. Cookie jar habilitado. Los scripts guardan IDs; no repetir 05/06 sin tener en cuenta que crean nuevos movimientos. Para casos 07/08 usar el proyecto recién creado, no el ejemplo con 10.000.

La revisión visual y la grabación son tareas de cierre, no evidencias simuladas. No presentar salidas históricas como resultados del código actual.

## Casos nuevos del chatbot
Se prueban 40 formulaciones de FAQ, seguimiento de contexto, contacto real o ausente y ausencia de confirmación de pagos o saldo inventado. La interfaz también se comprobó con DOM simulado para sugerencias, consulta de seguimiento y reinicio. Ver tests/chat.test.js y docs/CHATBOT.md.

## Pruebas nuevas 3.1.0
Dos servidores HTTP independientes con conexión diferida: salud al arrancar, gastos concurrentes 70/70 con saldo 100, reversión de operación inválida y carrera entre reducción de donación y gasto. Se verifica que no queden saldos negativos. Las pruebas de entrada verifican página, archivos y FAQ sin base, 503 para servicios que requieren entorno, origen HTTPS y configuración Vercel. Salida real en RESULTADOS_PRUEBAS.txt. No prueba una URL remota ni un cluster Atlas de cuenta.
