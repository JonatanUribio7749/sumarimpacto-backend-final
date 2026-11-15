const mongoose = require("mongoose");

const proyectoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, maxlength: 500 },
    descripcion: { type: String, required: true, trim: true, maxlength: 500 },
    organizacion_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organizacion",
      required: true,
    },
    objetivo_monto: { type: Number, min: 0, max: 1000000000, default: 0 },
  },
  { timestamps: true, strict: "throw" },
);

module.exports = mongoose.model("Proyecto", proyectoSchema, "proyectos");
