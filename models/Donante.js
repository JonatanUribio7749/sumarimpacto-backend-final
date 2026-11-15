const mongoose = require("mongoose");

const donanteSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, maxlength: 500 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^\S+@\S+\.\S+$/,
    },
    telefono: { type: String, trim: true, default: "" },
  },
  { timestamps: true, strict: "throw" },
);

module.exports = mongoose.model("Donante", donanteSchema, "donantes");
