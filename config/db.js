const mongoose = require("mongoose");
const Control = require("../models/ControlFinanciero");
mongoose.set("transactionAsyncLocalStorage", true);
let connecting;
async function connectDB(uri = process.env.MONGODB_URI) {
  if (connecting) return connecting;
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!uri) {
    if (process.env.VERCEL || process.env.NODE_ENV === "production")
      throw Error("Falta configurar MONGODB_URI");
    uri = "mongodb://127.0.0.1:27017/sumarimpacto?replicaSet=rs0";
  }
  connecting = (async () => {
    await mongoose.connect(uri, {
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 10000,
      serverSelectionTimeoutMS: 8000,
    });
    try {
      // Colección y documento preparados antes de iniciar transacciones.
      await Control.updateOne(
        { _id: "movimientos" },
        { $setOnInsert: { revision: 0 } },
        { upsert: true },
      );
    } catch (e) {
      if (e.code !== 11000) {
        await mongoose.disconnect();
        throw e;
      }
    }
    return mongoose;
  })();
  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}
module.exports = connectDB;
