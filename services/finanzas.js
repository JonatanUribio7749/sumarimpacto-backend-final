const mongoose = require("mongoose");
const Control = require("../models/ControlFinanciero");
exports.ejecutar = async (trabajo) =>
  mongoose.connection.transaction(
    async () => {
      const control = await Control.findByIdAndUpdate(
        "movimientos",
        { $inc: { revision: 1 } },
        { new: true },
      );
      if (!control) throw Error("Control financiero no inicializado");
      // El callback puede reintentarse. No enviar respuestas HTTP ni efectos externos aquí.
      return trabajo();
    },
    {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
      readPreference: "primary",
      maxCommitTimeMS: 10000,
    },
  );
