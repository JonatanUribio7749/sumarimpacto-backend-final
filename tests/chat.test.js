const { test } = require("node:test");
const assert = require("node:assert/strict");
const { responder } = require("../services/chatService");
const casos = [
  ["como me contacto con uds", "contacto"],
  ["¿Tienen WhatsApp?", "contacto"],
  ["Quiero hablar con alguien", "contacto"],
  ["¿Cuál es su horario?", "contacto"],
  ["Quiero donar", "donar"],
  ["hola quiero donar", "donar"],
  ["gracias, pero como dono", "donar"],
  ["¿Cómo registro una donación?", "registrar_donacion"],
  ["¿Puedo donar sin elegir proyecto?", "sin_proyecto"],
  ["¿Cómo asignar una donación?", "sin_proyecto"],
  ["No me deja registrar un gasto", "gasto_rechazado"],
  ["El gasto supera el saldo", "gasto_rechazado"],
  ["¿Cómo registro un gasto?", "registrar_gasto"],
  ["¿Por qué no puedo modificar una donación?", "editar_donacion"],
  ["¿Cómo elimino un proyecto?", "eliminar_proyecto"],
  ["Quiero borrar un gasto", "eliminar_movimiento"],
  ["¿Qué diferencia hay entre recibido y asignado?", "diferencia_fondos"],
  ["¿Cuál es el saldo global?", "diferencia_fondos"],
  ["¿Cuál es el monto mínimo?", "montos"],
  ["¿Puedo pagar con tarjeta?", "pago"],
  ["¿Emiten un comprobante?", "comprobante"],
  ["¿En qué se utiliza mi aporte?", "seguimiento"],
  ["¿Qué puede hacer cada rol?", "roles"],
  ["Me devuelve 403", "roles"],
  ["No puedo iniciar sesión", "login"],
  ["Los datos se pierden al cerrar", "persistencia"],
  ["¿Cómo creo un proyecto?", "crear_proyecto"],
  ["¿Cómo registro una organización?", "organizacion"],
  ["¿Cómo creo un donante?", "donantes"],
  ["Quiero colaborar con ropa", "bienes"],
  ["¿Cómo protegen mis datos personales?", "seguridad"],
  ["¿Cómo ejecuto las pruebas?", "pruebas"],
  ["Necesito ayuda con el panel", "ayuda"],
  ["¿Qué es SumarImpacto?", "identidad"],
  ["Hola", "saludo"],
  ["Gracias", "gracias"],
  ["¿Cuánto queda?", "saldo"],
  ["¿Qué proyectos tienen?", "proyectos"],
  ["Quiero modificar algo", "aclaracion"],
  ["¿Cuál es la capital de Japón?", "desconocido"],
];
for (const [pregunta, tema] of casos)
  test("FAQ: " + pregunta, () => {
    const result = responder(pregunta, undefined, {});
    assert.equal(result.tema, tema);
    assert.ok(result.respuesta.length > 15);
    assert.ok(result.sugerencias.length);
  });
test("Seguimiento de tema sin almacenar conversación", () => {
  assert.equal(responder("y sin elegir uno", "donar", {}).tema, "sin_proyecto");
  assert.equal(
    responder("¿y cómo lo hago?", "donar", {}).tema,
    "registrar_donacion",
  );
  assert.equal(
    responder("¿puedo cambiarla?", "registrar_donacion", {}).tema,
    "editar_donacion",
  );
  assert.equal(responder("¿y dónde lo veo?", "saldo", {}).tema, "seguimiento");
  assert.equal(responder("¿y cómo?", "tema-inventado", {}).tema, "desconocido");
});
test("Contacto solo utiliza datos configurados", () => {
  const sin = responder("contacto", null, {}).respuesta;
  assert.match(sin, /no hay un correo/);
  assert.ok(!sin.includes("CONTACT_EMAIL"));
  const con = responder("contacto", null, {
    CONTACT_EMAIL: "real@example.org",
    CONTACT_PHONE: "+54 381 0000000",
    CONTACT_HOURS: "Lunes 9 a 12",
  }).respuesta;
  for (const dato of ["real@example.org", "+54 381 0000000", "Lunes 9 a 12"])
    assert.ok(con.includes(dato));
});
test("No confirma cobros ni inventa saldo actual", () => {
  assert.match(
    responder("pagar con tarjeta", null, {}).respuesta,
    /no integra/,
  );
  assert.match(responder("saldo", null, {}).respuesta, /iniciá sesión/);
});
