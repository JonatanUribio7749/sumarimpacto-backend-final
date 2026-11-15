const chat = require("../services/chatService");
exports.responder = (req, res) => {
  const { mensaje, contexto } = req.body || {};
  if (typeof mensaje !== "string" || !mensaje.trim() || mensaje.length > 500)
    return res
      .status(400)
      .json({ mensaje: "Escribí entre 1 y 500 caracteres" });
  if (
    contexto !== undefined &&
    (typeof contexto !== "string" || contexto.length > 50)
  )
    return res.status(400).json({ mensaje: "Contexto de consulta inválido" });
  res.json({
    ...chat.responder(mensaje, contexto),
    tipo: "asistente de preguntas frecuentes",
  });
};
