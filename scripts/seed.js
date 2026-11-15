require("dotenv").config();
const mongoose = require("mongoose");
const Usuario = require("../models/Usuario");
const { hash } = require("../services/password");
async function seed() {
  const email = process.env.ADMIN_EMAIL,
    clave = process.env.ADMIN_PASSWORD;
  if (!email || !clave || clave.length < 12 || /CAMBIAR/.test(clave))
    throw Error(
      "Configurá ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 12 caracteres)",
    );
  const existing = await Usuario.findOne({ email });
  if (!existing)
    await Usuario.create({
      nombre: "Jonatan Emanuel Uribio",
      email,
      passwordHash: await hash(clave),
      rol: "admin",
    });
  console.log(
    existing
      ? "Administrador existente: no se modificó su clave"
      : "Administrador creado",
  );
  const { Organizacion, Donante, Proyecto, Donacion } = require("../models");
  // Solo agrega ejemplos en una base sin organizaciones; no borra datos existentes.
  if ((await Organizacion.countDocuments()) === 0) {
    const o = await Organizacion.create({
      nombre: "Red comunitaria · DEMO",
      descripcion: "Datos ficticios para defensa",
      contacto: "demo@example.org",
    });
    const d = await Donante.create({
      nombre: "Donante de ejemplo",
      email: "donante@example.org",
    });
    const pr = await Proyecto.create({
      nombre: "Huerta comunitaria",
      descripcion: "Herramientas y semillas para el barrio",
      organizacion_id: o._id,
      objetivo_monto: 100000,
    });
    await Donacion.create({
      donante_id: d._id,
      proyecto_id: pr._id,
      monto: 10000,
    });
    await Donacion.create({ donante_id: d._id, monto: 2000 });
    console.log(
      "Ejemplos ficticios creados: $10.000 asignados y $2.000 sin asignar",
    );
  }
}
module.exports = seed;
if (require.main === module)
  require("../config/db")()
    .then(seed)
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
