const Organizacion = require("../models/Organizacion");
const Donante = require("../models/Donante");
const Proyecto = require("../models/Proyecto");
const Donacion = require("../models/Donacion");
const Gasto = require("../models/Gasto");

function conErrores(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

const finanzas = require("../services/finanzas");

function validarMonto(monto) {
  if (
    typeof monto !== "number" ||
    !Number.isFinite(monto) ||
    monto < 1 ||
    monto > 1000000000 ||
    Math.abs(monto * 100 - Math.round(monto * 100)) > 0.00001
  )
    throw errorHttp(
      400,
      "Monto numérico entre 1 y 1.000.000.000, con hasta dos decimales",
    );
}
function errorHttp(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validarCamposActualizacion(body, camposPermitidos) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw errorHttp(400, "Los datos deben ser un objeto JSON");
  }
  const campos = Object.keys(body);
  if (
    !campos.length ||
    campos.some((campo) => !camposPermitidos.includes(campo))
  ) {
    throw errorHttp(
      400,
      "La actualización contiene campos no permitidos o está vacía",
    );
  }
}

async function requerir(Model, id, entidad) {
  const documento = await Model.findById(id);
  if (!documento) throw errorHttp(404, `${entidad} no encontrado`);
  return documento;
}

async function validarReferencia(Model, id, entidad) {
  if (id !== undefined && id !== null && id !== "") {
    await requerir(Model, id, entidad);
  }
}

async function totalPorProyecto(Model, proyectoId) {
  const [resultado] = await Model.aggregate([
    { $match: { proyecto_id: proyectoId } },
    {
      $group: {
        _id: null,
        total: { $sum: { $round: [{ $multiply: ["$monto", 100] }, 0] } },
      },
    },
  ]);
  return (resultado?.total || 0) / 100;
}

async function calcularSaldo(proyectoId) {
  // En transacciones las consultas de una sesión se ejecutan en orden.
  const totalDonado = await totalPorProyecto(Donacion, proyectoId);
  const totalGastado = await totalPorProyecto(Gasto, proyectoId);
  return {
    totalDonado,
    totalGastado,
    saldoDisponible: Math.round((totalDonado - totalGastado) * 100) / 100,
  };
}

const listarDonantes = conErrores(async (req, res) => {
  res.json(await Donante.find());
});

const crearDonante = conErrores(async (req, res) => {
  validarCamposActualizacion(req.body, ["nombre", "email", "telefono"]);
  const donante = await Donante.create(req.body);
  res.status(201).json(donante);
});

const listarOrganizaciones = conErrores(async (req, res) => {
  res.json(await Organizacion.find());
});

const crearOrganizacion = conErrores(async (req, res) => {
  validarCamposActualizacion(req.body, ["nombre", "descripcion", "contacto"]);
  const organizacion = await Organizacion.create(req.body);
  res.status(201).json(organizacion);
});

const listarProyectos = conErrores(async (req, res) => {
  const filtro = {};
  if (req.query.organizacion_id !== undefined) {
    await requerir(Organizacion, req.query.organizacion_id, "Organización");
    filtro.organizacion_id = req.query.organizacion_id;
  }
  res.json(await Proyecto.find(filtro));
});

const obtenerProyecto = conErrores(async (req, res) => {
  res.json(await requerir(Proyecto, req.params.id, "Proyecto"));
});

const crearProyecto = conErrores(async (req, res) => {
  const body = req.body || {};
  validarCamposActualizacion(body, [
    "nombre",
    "descripcion",
    "organizacion_id",
    "objetivo_monto",
  ]);
  await validarReferencia(Organizacion, body.organizacion_id, "Organización");
  const proyecto = await Proyecto.create(body);
  res.status(201).json(proyecto);
});

const actualizarProyecto = conErrores(async (req, res) => {
  const body = req.body || {};
  validarCamposActualizacion(body, [
    "nombre",
    "descripcion",
    "organizacion_id",
    "objetivo_monto",
  ]);
  await validarReferencia(Organizacion, body.organizacion_id, "Organización");
  const proyecto = await Proyecto.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true,
  });
  if (!proyecto) throw errorHttp(404, "Proyecto no encontrado");
  res.json(proyecto);
});

const eliminarProyecto = conErrores(async (req, res) => {
  await finanzas.ejecutar(async () => {
    await requerir(Proyecto, req.params.id, "Proyecto");
    const donacion = await Donacion.exists({ proyecto_id: req.params.id });
    const gasto = await Gasto.exists({ proyecto_id: req.params.id });
    if (donacion || gasto)
      throw errorHttp(
        400,
        "No se puede eliminar un proyecto con movimientos asociados",
      );
    await Proyecto.findByIdAndDelete(req.params.id);
  });
  res.json({ mensaje: "Proyecto eliminado" });
});
const registrarDonacion = conErrores(async (req, res) => {
  const body = req.body || {};
  validarCamposActualizacion(body, [
    "donante_id",
    "proyecto_id",
    "monto",
    "fecha",
  ]);
  validarMonto(body.monto);
  const donacion = await finanzas.ejecutar(async () => {
    await validarReferencia(Donante, body.donante_id, "Donante");
    await validarReferencia(Proyecto, body.proyecto_id, "Proyecto");
    return Donacion.create(body);
  });
  res.status(201).json(donacion);
});
const actualizarDonacion = conErrores(async (req, res) => {
  const body = req.body || {};
  validarCamposActualizacion(body, [
    "donante_id",
    "proyecto_id",
    "monto",
    "fecha",
  ]);
  if (body.monto !== undefined) validarMonto(body.monto);
  const donacion = await finanzas.ejecutar(async () => {
    const actual = await requerir(Donacion, req.params.id, "Donación");
    if (
      actual.proyecto_id &&
      (await Gasto.exists({ proyecto_id: actual.proyecto_id }))
    )
      throw errorHttp(
        400,
        "No se puede modificar la donación: el proyecto ya registró gastos",
      );
    await validarReferencia(Donante, body.donante_id, "Donante");
    await validarReferencia(Proyecto, body.proyecto_id, "Proyecto");
    return Donacion.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });
  });
  res.json(donacion);
});
const registrarGasto = conErrores(async (req, res) => {
  const body = req.body || {};
  validarCamposActualizacion(body, [
    "proyecto_id",
    "concepto",
    "monto",
    "fecha",
  ]);
  validarMonto(body.monto);
  if (!body.proyecto_id) throw errorHttp(400, "El proyecto es obligatorio");
  const gasto = await finanzas.ejecutar(async () => {
    const proyecto = await requerir(Proyecto, body.proyecto_id, "Proyecto");
    const { saldoDisponible } = await calcularSaldo(proyecto._id);
    if (body.monto > saldoDisponible)
      throw errorHttp(
        400,
        `El gasto supera el saldo disponible (${saldoDisponible})`,
      );
    return Gasto.create(body);
  });
  res.status(201).json(gasto);
});

const consultarSaldo = conErrores(async (req, res) => {
  const proyecto = await requerir(Proyecto, req.params.id, "Proyecto");
  const { totalDonado, totalGastado, saldoDisponible } = await calcularSaldo(
    proyecto._id,
  );
  res.json({
    proyecto_id: proyecto._id,
    total_donado: totalDonado,
    total_gastado: totalGastado,
    saldo_disponible: saldoDisponible,
  });
});

const listarDonacionesProyecto = conErrores(async (req, res) => {
  await requerir(Proyecto, req.params.id, "Proyecto");
  res.json(await Donacion.find({ proyecto_id: req.params.id }));
});

const listarGastosProyecto = conErrores(async (req, res) => {
  await requerir(Proyecto, req.params.id, "Proyecto");
  res.json(await Gasto.find({ proyecto_id: req.params.id }));
});

const resumen = conErrores(async (req, res) => {
  const [donaciones, gastos] = await Promise.all([
    Donacion.find().lean(),
    Gasto.find().lean(),
  ]);
  const total = donaciones.reduce((n, d) => n + Math.round(d.monto * 100), 0);
  const sinAsignar = donaciones
    .filter((d) => !d.proyecto_id)
    .reduce((n, d) => n + Math.round(d.monto * 100), 0);
  const gastado = gastos.reduce((n, d) => n + Math.round(d.monto * 100), 0);
  res.json({
    total_recibido: total / 100,
    sin_asignar: sinAsignar / 100,
    total_asignado: (total - sinAsignar) / 100,
    total_gastado: gastado / 100,
    saldo_proyectos: (total - sinAsignar - gastado) / 100,
    saldo_global: (total - gastado) / 100,
  });
});
const listarDonaciones = conErrores(async (req, res) =>
  res.json(
    await Donacion.find()
      .populate("donante_id", "nombre")
      .populate("proyecto_id", "nombre"),
  ),
);
const listarGastos = conErrores(async (req, res) =>
  res.json(await Gasto.find().populate("proyecto_id", "nombre")),
);
module.exports = {
  resumen,
  listarDonaciones,
  listarGastos,
  listarDonantes,
  crearDonante,
  listarOrganizaciones,
  crearOrganizacion,
  listarProyectos,
  obtenerProyecto,
  crearProyecto,
  actualizarProyecto,
  eliminarProyecto,
  registrarDonacion,
  actualizarDonacion,
  registrarGasto,
  consultarSaldo,
  listarDonacionesProyecto,
  listarGastosProyecto,
};
