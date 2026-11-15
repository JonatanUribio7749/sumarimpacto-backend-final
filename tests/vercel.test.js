const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../app");
test("Página, archivos públicos y FAQ funcionan sin base ni credenciales", async () => {
  const page = await request(app).get("/");
  assert.equal(page.status, 200);
  assert.match(page.text, /chatSuggestions/);
  assert.equal(page.headers["cache-control"], "no-store");
  for (const asset of ["/app.js", "/styles.css"])
    assert.equal((await request(app).get(asset)).status, 200);
  assert.equal(
    (await request(app).post("/api/chat").send({ mensaje: "Quiero donar" }))
      .status,
    200,
  );
  assert.equal((await request(app).get("/health")).status, 503);
  assert.equal(
    (
      await request(app)
        .post("/api/auth/login")
        .send({ email: "x", clave: "x" })
    ).status,
    503,
  );
});
test("Entorno de producción exige secreto y origen HTTPS exacto", () => {
  const names = ["NODE_ENV", "JWT_SECRET", "APP_ORIGIN", "MONGODB_URI"];
  const original = Object.fromEntries(names.map((k) => [k, process.env[k]]));
  try {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "x".repeat(40);
    process.env.MONGODB_URI = "mongodb://test";
    process.env.APP_ORIGIN = "https://sumar.example";
    const validar = require("../config/validateEnv");
    assert.doesNotThrow(validar);
    for (const invalid of [
      "http://sumar.example",
      "https://sumar.example/",
      "https://sumar.example/ruta",
      "",
    ]) {
      process.env.APP_ORIGIN = invalid;
      assert.throws(validar);
    }
    process.env.APP_ORIGIN = "https://sumar.example";
    process.env.JWT_SECRET = "corta";
    assert.throws(validar);
  } finally {
    for (const k of names) {
      if (original[k] === undefined) delete process.env[k];
      else process.env[k] = original[k];
    }
  }
});
test("Configuración Vercel incluye vistas y omite dependencias de desarrollo", () => {
  const config = require("../vercel.json");
  assert.equal(config.functions["app.js"].includeFiles, "views/**");
  assert.equal(config.installCommand, "npm ci --omit=dev");
  assert.equal(require("../package.json").engines.node, "22.x");
});
