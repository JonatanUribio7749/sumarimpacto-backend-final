const mongoose = require("mongoose");

const gastoSchema = new mongoose.Schema(
  {
    proyecto_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proyecto",
      required: true,
    },
    concepto: { type: String, required: true, trim: true, maxlength: 500 },
    monto: { type: Number, required: true, min: 1, max: 1000000000 },
    fecha: { type: Date, default: Date.now },
  },
  { timestamps: true, strict: "throw" },
);

module.exports = mongoose.model("Gasto", gastoSchema, "gastos");
