const mongoose = require("mongoose");
// Documento compartido: cada movimiento lo modifica dentro de la misma transacción.
// MongoDB detecta conflictos aunque las peticiones lleguen a procesos diferentes.
module.exports = mongoose.model(
  "ControlFinanciero",
  new mongoose.Schema(
    {
      _id: String,
      revision: { type: Number, default: 0 },
    },
    { versionKey: false },
  ),
  "control_financiero",
);
