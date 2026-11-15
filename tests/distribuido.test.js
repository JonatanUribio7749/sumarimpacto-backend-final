const test = require("node:test");
const assert = require("node:assert/strict");
const { fork } = require("node:child_process");
const path = require("node:path");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const request = require("supertest");
const mongoose = require("mongoose");
const connect = require("../config/db");
const { hash } = require("../services/password");
const Usuario = require("../models/Usuario");
const {
  Organizacion,
  Donante,
  Proyecto,
  Donacion,
  Gasto,
} = require("../models");
const Control = require("../models/ControlFinanciero");
test("Dos procesos comparten protección financiera y rollback MongoDB", async (t) => {
  const mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    instanceOpts: [
      { args: process.platform === "win32" ? [] : ["--nounixsocket"] },
    ],
  });
  const children = [];
  t.after(async () => {
    for (const c of children) c.kill();
    await mongoose.disconnect();
    await mongo.stop();
  });
  const uri = mongo.getUri();
  await connect(uri);
  await Usuario.create({
    nombre: "Test distribuido",
    email: "test@dist.org",
    passwordHash: await hash("TestPassword123!"),
    rol: "admin",
  });
  const o = await Organizacion.create({
    nombre: "Test",
    descripcion: "Test",
    contacto: "test@dist.org",
  });
  const d = await Donante.create({ nombre: "Test", email: "test@dist.org" });
  const p = await Proyecto.create({
    nombre: "Concurrencia",
    descripcion: "Dos procesos",
    organizacion_id: o._id,
  });
  await Donacion.create({ donante_id: d._id, proyecto_id: p._id, monto: 100 });
  async function launch() {
    const child = fork(path.join(__dirname, "fixtures/server.cjs"), [], {
      env: {
        ...process.env,
        MONGODB_URI: uri,
        NODE_ENV: "test",
        LAZY_CONNECT: "1",
      },
      stdio: ["ignore", "ignore", "pipe", "ipc"],
    });
    children.push(child);
    let errors = "";
    child.stderr.on("data", (x) => (errors += x));
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(Error("Servidor de prueba no inició")),
        15000,
      );
      child.once("message", (m) => {
        clearTimeout(timer);
        resolve(m.port);
      });
      child.once("exit", (code) => {
        clearTimeout(timer);
        reject(Error("Salida " + code + ": " + errors));
      });
    });
    const agent = request.agent("http://127.0.0.1:" + port);
    const health = await agent.get("/health");
    assert.equal(health.status, 200);
    const login = await agent
      .post("/api/auth/login")
      .send({ email: "test@dist.org", clave: "TestPassword123!" });
    assert.equal(login.status, 200);
    return agent;
  }
  const a = await launch(),
    b = await launch();
  const result = await Promise.all(
    [a, b].map((agent) =>
      agent
        .post("/api/gastos")
        .send({ proyecto_id: p._id, concepto: "Compra", monto: 70 }),
    ),
  );
  assert.deepEqual(result.map((x) => x.status).sort(), [201, 400]);
  assert.equal(
    (await a.get("/api/proyectos/" + p._id + "/saldo")).body.saldo_disponible,
    30,
  );
  assert.equal(await Gasto.countDocuments({ proyecto_id: p._id }), 1);
  const before = (await Control.findById("movimientos")).revision;
  const invalid = await b
    .post("/api/gastos")
    .send({ proyecto_id: p._id, concepto: "", monto: 1 });
  assert.equal(invalid.status, 400);
  assert.equal((await Control.findById("movimientos")).revision, before);
  assert.equal(await Gasto.countDocuments({ proyecto_id: p._id }), 1);
  // Reducir la donación y gastar a la vez no puede dejar saldo negativo.
  const p2 = await Proyecto.create({
    nombre: "Edición concurrente",
    descripcion: "Test",
    organizacion_id: o._id,
  });
  const d2 = await Donacion.create({
    donante_id: d._id,
    proyecto_id: p2._id,
    monto: 100,
  });
  const [edit, expense] = await Promise.all([
    a.put("/api/donaciones/" + d2._id).send({ monto: 10 }),
    b
      .post("/api/gastos")
      .send({ proyecto_id: p2._id, concepto: "Compra", monto: 70 }),
  ]);
  assert.ok(
    (edit.status === 200 && expense.status === 400) ||
      (edit.status === 400 && expense.status === 201),
  );
  assert.ok(
    (await a.get("/api/proyectos/" + p2._id + "/saldo")).body
      .saldo_disponible >= 0,
  );
});
