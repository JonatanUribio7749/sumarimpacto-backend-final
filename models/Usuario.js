const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      match: /^\S+@\S+\.\S+$/,
    },
    passwordHash: { type: String, required: true, select: false },
    rol: {
      type: String,
      enum: ["admin", "operador", "consulta"],
      default: "consulta",
    },
  },
  { timestamps: true },
);
module.exports = mongoose.model("Usuario", schema, "usuarios");
