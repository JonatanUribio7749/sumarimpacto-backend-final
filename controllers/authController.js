const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");
const password = require("../services/password");
const cookie = () => ({
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/",
});
exports.login = async (req, res) => {
  const { email, clave } = req.body || {};
  if (
    typeof email !== "string" ||
    typeof clave !== "string" ||
    clave.length > 128
  )
    return res.status(400).json({ mensaje: "Email y clave son obligatorios" });
  const user = await Usuario.findOne({
    email: email.trim().toLowerCase(),
  }).select("+passwordHash");
  // Derivación también ante usuario inexistente para reducir diferencias de tiempo.
  const valid = await password.verify(
    clave,
    user?.passwordHash || "00000000000000000000000000000000:" + "00".repeat(64),
  );
  if (!user || !valid)
    return res.status(401).json({ mensaje: "Credenciales incorrectas" });
  const token = jwt.sign({}, process.env.JWT_SECRET, {
    subject: String(user._id),
    expiresIn: "2h",
    issuer: "sumarimpacto",
    algorithm: "HS256",
  });
  res
    .cookie("token", token, { ...cookie(), maxAge: 7200000 })
    .json({ nombre: user.nombre, rol: user.rol });
};
exports.logout = (req, res) =>
  res.clearCookie("token", cookie()).json({ mensaje: "Sesión cerrada" });
exports.me = (req, res) =>
  res.json({
    nombre: req.usuario.nombre,
    email: req.usuario.email,
    rol: req.usuario.rol,
  });
