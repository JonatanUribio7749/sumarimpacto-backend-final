const mongoose = require("mongoose");

const organizacionSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, maxlength: 500 },
    descripcion: { type: String, required: true, trim: true, maxlength: 500 },
    contacto: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true, strict: "throw" },
);

module.exports = mongoose.model(
  "Organizacion",
  organizacionSchema,
  "organizaciones",
);
