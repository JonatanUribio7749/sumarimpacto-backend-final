module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  let status = err.status || 500;
  if (
    ["ValidationError", "CastError", "StrictModeError"].includes(err.name) ||
    err.type === "entity.parse.failed"
  )
    status = 400;
  if (err.code === 11000) status = 409;
  if (![400, 401, 403, 404, 409, 413, 429].includes(status)) status = 500;
  let mensaje = status === 500 ? "Error interno del servidor" : err.message;
  if (err.name === "CastError") mensaje = "Identificador o dato inválido";
  if (err.name === "ValidationError")
    mensaje = Object.values(err.errors)
      .map(
        (e) =>
          `Campo ${e.path}: ${e.kind === "required" ? "obligatorio" : "valor o formato inválido"}`,
      )
      .join("; ");
  if (err.type === "entity.parse.failed") mensaje = "JSON inválido";
  if (err.code === 11000) mensaje = "Ya existe un registro con ese valor único";
  if (status === 500) console.error(err.message);
  res.status(status).json({ mensaje });
};
