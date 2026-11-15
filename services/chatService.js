const base = require("../data/preguntasFrecuentes.json");
const temas = new Set(base.map((x) => x.id));
const normalizar = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const reglas = base.map((x) => ({ ...x, regex: new RegExp(x.patron) }));
function contacto(env) {
  const canales = [];
  if (env.CONTACT_EMAIL)
    canales.push("Correo: " + env.CONTACT_EMAIL.trim() + ".");
  if (env.CONTACT_PHONE)
    canales.push("Teléfono: " + env.CONTACT_PHONE.trim() + ".");
  if (env.CONTACT_HOURS)
    canales.push("Horario informado: " + env.CONTACT_HOURS.trim() + ".");
  return canales.length
    ? canales.join(" ") +
        " Estos son los datos configurados por el responsable; el chat no envía mensajes ni transfiere a una persona."
    : "Todavía no hay un correo o teléfono de atención habilitado en esta demostración. Para colaborar, solicitá el canal al responsable que te compartió la aplicación. No voy a inventar un contacto.";
}
function responder(mensaje, contexto, env = process.env) {
  const text = normalizar(mensaje);
  const previo = temas.has(contexto) ? contexto : null;
  let item;
  // Las continuaciones solo heredan un tema conocido; no reciben instrucciones del cliente.
  if (
    /^(?:y )?(?:sin elegir|sin elegir uno|sin proyecto|sin elegir proyecto)$/.test(
      text,
    ) &&
    ["donar", "registrar_donacion", "proyectos", "sin_proyecto"].includes(
      previo,
    )
  )
    item = base.find((x) => x.id === "sin_proyecto");
  else if (
    /^(?:y )?(?:como|como lo hago|como hago|como se hace|donde|donde lo veo)$/.test(
      text,
    ) &&
    previo
  ) {
    const seguimiento = {
      donar: "registrar_donacion",
      saldo: "seguimiento",
      proyectos: "proyectos",
      gasto_rechazado: "registrar_gasto",
      contacto: "contacto",
    };
    item = base.find((x) => x.id === (seguimiento[previo] || previo));
  } else if (
    /^(?:y )?(?:para (?:editar|cambiar)|puedo cambiarla|puedo editarla)$/.test(
      text,
    ) &&
    ["donar", "registrar_donacion", "sin_proyecto"].includes(previo)
  )
    item = base.find((x) => x.id === "editar_donacion");
  if (!item) item = reglas.find((x) => x.regex.test(text));
  if (
    !item &&
    /^(?:(?:quiero|necesito|puedo) )?(?:editar|modificar|cambiar|eliminar|borrar|no me deja|no puedo)(?: algo)?$/.test(
      text,
    )
  ) {
    return {
      respuesta:
        "¿Te referís a un proyecto, una donación o un gasto? Elegí la opción para que pueda explicarte la regla correcta.",
      tema: "aclaracion",
      sugerencias: [
        "¿Cómo edito una donación?",
        "¿Cómo elimino un proyecto?",
        "¿Por qué se rechaza un gasto?",
      ],
    };
  }
  if (!item)
    return {
      respuesta:
        "No pude identificar esa consulta con seguridad. Puedo ayudarte con las funciones de SumarImpacto. Probá una pregunta como “¿Cómo registro una donación?” o elegí un tema.",
      tema: "desconocido",
      sugerencias: [
        "¿Qué es SumarImpacto?",
        "¿Cómo puedo donar?",
        "¿Cómo me contacto con ustedes?",
        "Necesito ayuda con el panel",
      ],
    };
  const relacionadas = {
    donar: [
      "¿Cómo me contacto con ustedes?",
      "¿Puedo donar sin elegir proyecto?",
      "¿Qué medios de pago hay?",
    ],
    contacto: ["¿Cómo puedo donar?", "¿Qué proyectos tienen?"],
    saldo: [
      "¿Qué diferencia hay entre recibido y asignado?",
      "¿Por qué se rechaza un gasto?",
    ],
    registrar_donacion: [
      "¿Cómo creo un donante?",
      "¿Puedo donar sin proyecto?",
      "¿Cómo edito una donación?",
    ],
    gasto_rechazado: ["¿Cómo registro un gasto?", "¿Qué puede hacer cada rol?"],
    editar_donacion: [
      "¿Qué puede hacer cada rol?",
      "¿Puedo donar sin proyecto?",
    ],
    proyectos: ["¿Cómo creo un proyecto?", "¿Cómo consulto el saldo?"],
    saludo: [
      "¿Cómo puedo donar?",
      "Necesito ayuda con el panel",
      "¿Cómo me contacto con ustedes?",
    ],
    ayuda: [
      "¿Cómo registro una donación?",
      "¿Cómo registro un gasto?",
      "¿Qué diferencia hay entre recibido y asignado?",
      "¿Los datos se pierden al cerrar?",
    ],
  };
  return {
    respuesta: item.id === "contacto" ? contacto(env) : item.respuesta,
    tema: item.id,
    sugerencias: relacionadas[item.id] || [
      "¿Cómo puedo donar?",
      "¿Qué puede hacer cada rol?",
      "¿Cómo me contacto con ustedes?",
    ],
  };
}
module.exports = { responder, normalizar, temas };
