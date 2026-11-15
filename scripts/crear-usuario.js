require("dotenv").config();
const mongoose = require("mongoose");
const Usuario = require("../models/Usuario");
const { hash } = require("../services/password");
(async () => {
  const {
    NUEVO_EMAIL: email,
    NUEVA_CLAVE: clave,
    NUEVO_ROL: rol = "consulta",
  } = process.env;
  if (
    !email ||
    !clave ||
    clave.length < 12 ||
    !["admin", "operador", "consulta"].includes(rol)
  )
    throw Error("Configurá NUEVO_EMAIL, NUEVA_CLAVE (12+) y NUEVO_ROL");
  await require("../config/db")();
  await Usuario.create({
    nombre: email,
    email,
    passwordHash: await hash(clave),
    rol,
  });
  console.log("Usuario creado");
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
