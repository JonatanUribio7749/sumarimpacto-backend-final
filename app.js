require("dotenv").config();
const express = require("express");
const path = require("node:path");
const { rateLimit } = require("express-rate-limit");
const app = express();
app.disable("x-powered-by");
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.engine("pug", require("pug").__express);
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
app.use(require("helmet")());
app.use((req, res, next) => {
  if (req.path === "/" || req.path.startsWith("/api/"))
    res.set("Cache-Control", "no-store");
  next();
});
app.use(require("./middleware/registrarPeticion"));
app.use(express.json({ limit: "16kb" }));
app.use(require("cookie-parser")());
app.use((req, res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("Origin");
    if (
      origin &&
      origin !== (process.env.APP_ORIGIN || "http://localhost:3000")
    )
      return res.status(403).json({ mensaje: "Origen no permitido" });
    if (req.method !== "DELETE" && !req.is("application/json"))
      return res
        .status(400)
        .json({ mensaje: "Usá Content-Type application/json" });
  }
  next();
});
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => res.render("index"));
app.use(async (req, res, next) => {
  // El HTML y el chat de FAQ no necesitan base; login, datos y salud sí.
  if (
    req.path === "/health" ||
    (req.path.startsWith("/api/") && req.path !== "/api/chat")
  ) {
    try {
      require("./config/validateEnv")();
      await require("./config/db")();
    } catch {
      return res
        .status(503)
        .json({
          mensaje:
            "No se pudo iniciar la conexión. Revisá la configuración de MongoDB y del entorno.",
        });
    }
  }
  next();
});
app.get("/health", (req, res) => {
  const ready = require("mongoose").connection.readyState === 1;
  res.status(ready ? 200 : 503).json({
    estado: ready ? "ok" : "sin base de datos",
    version: require("./package.json").version,
  });
});
const auth = require("./middleware/auth");
const controller = require("./controllers/authController");
app.post(
  "/api/auth/login",
  rateLimit({
    windowMs: 15 * 60000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
  controller.login,
);
app.post("/api/auth/logout", controller.logout);
app.get("/api/auth/me", auth.autenticar, controller.me);
app.post(
  "/api/chat",
  rateLimit({ windowMs: 60000, limit: 30, legacyHeaders: false }),
  require("./controllers/chatController").responder,
);
app.use("/api", auth.autenticar, require("./routes/apiRoutes"));
app.use((req, res) => res.status(404).json({ mensaje: "Ruta no encontrada" }));
app.use(require("./middleware/errors"));
if (require.main === module && !process.env.VERCEL) {
  require("./config/validateEnv")();
  require("./config/db")()
    .then(() =>
      app.listen(Number(process.env.PORT) || 3000, "0.0.0.0", () =>
        console.log("SumarImpacto en puerto " + (process.env.PORT || 3000)),
      ),
    )
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
}
module.exports = app;
