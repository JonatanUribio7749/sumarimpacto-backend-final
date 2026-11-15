module.exports = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret.includes("CAMBIAR"))
    throw Error("Configurá JWT_SECRET aleatorio de al menos 32 caracteres");
  if (process.env.NODE_ENV === "production") {
    if (!process.env.MONGODB_URI) throw Error("Falta MONGODB_URI");
    const origin = process.env.APP_ORIGIN;
    if (!origin || !/^https:\/\/[^/]+$/.test(origin))
      throw Error("APP_ORIGIN debe ser un origen HTTPS sin barra final");
  }
};
