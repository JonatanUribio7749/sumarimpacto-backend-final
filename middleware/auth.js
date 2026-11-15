const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");
exports.autenticar = async (req, res, next) => {
  const token =
    req.cookies?.token || req.get("Authorization")?.replace(/^Bearer /, "");
  if (!token)
    return res.status(401).json({ mensaje: "Iniciá sesión para continuar" });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "sumarimpacto",
    });
  } catch {
    return res.status(401).json({ mensaje: "Sesión inválida o vencida" });
  }
  try {
    req.usuario = await Usuario.findById(payload.sub);
    if (!req.usuario)
      return res.status(401).json({ mensaje: "Usuario no disponible" });
    next();
  } catch (e) {
    next(e);
  }
};
exports.roles =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.usuario.rol)
      ? next()
      : res.status(403).json({ mensaje: "Tu rol no permite esta operación" });
