process.env.JWT_SECRET = "test-only-secret-with-more-than-32-characters";
const assert = require("node:assert/strict");
const test = require("node:test");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const request = require("supertest");
const app = require("../app");
const connectDB = require("../config/db");

test("API MongoDB conserva reglas, relaciones y respuestas HTTP", async (t) => {
  const mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    instanceOpts: [
      {
        launchTimeout: 60000,
        args: process.platform === "win32" ? [] : ["--nounixsocket"],
      },
    ],
  });
  t.after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });
  const originalUri = process.env.MONGODB_URI;
  process.env.MONGODB_URI = mongo.getUri();
  try {
    await connectDB();
  } finally {
    if (originalUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = originalUri;
  }

  const Usuario = require("../models/Usuario");
  const { hash } = require("../services/password");
  await Usuario.create({
    nombre: "Admin Test",
    email: "admin@test.org",
    passwordHash: await hash("TestPassword123!"),
    rol: "admin",
  });
  const client = request.agent(app);
  assert.equal((await request(app).get("/api/proyectos")).status, 401);
  assert.equal(
    (
      await client
        .post("/api/auth/login")
        .send({ email: "admin@test.org", clave: "incorrecta" })
    ).status,
    401,
  );
  assert.equal(
    (
      await client
        .post("/api/auth/login")
        .send({ email: "admin@test.org", clave: "TestPassword123!" })
    ).status,
    200,
  );
  let response = await client.get("/");
  assert.equal(response.status, 200);
  assert.match(response.text, /SumarImpacto/);

  response = await client.post("/api/organizaciones").send({
    nombre: "Asociación",
    descripcion: "Organización comunitaria",
    contacto: "contacto@example.org",
  });
  assert.equal(response.status, 201);
  const organizacion = response.body;
  assert.ok(organizacion._id);
  assert.ok(organizacion.createdAt);

  response = await client.get("/api/organizaciones");
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);
  assert.ok(response.body[0]._id);

  response = await client.post("/api/donantes").send({
    nombre: "Donante",
    email: "d@example.org",
    telefono: "+54 11 1234-5678",
  });
  assert.equal(response.status, 201);
  const donante = response.body;
  assert.equal(donante.email, "d@example.org");
  assert.ok(donante.updatedAt);

  response = await client.get("/api/donantes");
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);

  response = await client.post("/api/proyectos").send({
    nombre: "Huerta comunitaria",
    descripcion: "Producción de alimentos",
    organizacion_id: organizacion._id,
    objetivo_monto: 20000,
  });
  assert.equal(response.status, 201);
  const proyecto = response.body;
  assert.equal(proyecto.organizacion_id, organizacion._id);
  assert.equal(proyecto.objetivo_monto, 20000);

  response = await client.post("/api/proyectos").send({
    nombre: "Proyecto inválido",
    descripcion: "Sin organización existente",
    organizacion_id: new mongoose.Types.ObjectId().toString(),
  });
  assert.equal(response.status, 404);

  response = await client.post("/api/proyectos").send({
    nombre: "Proyecto malformado",
    descripcion: "ID inválido",
    organizacion_id: "id-invalido",
  });
  assert.equal(response.status, 400);

  response = await client.post("/api/proyectos").send({ nombre: "Incompleto" });
  assert.equal(response.status, 400);

  response = await client.get(`/api/proyectos/${proyecto._id}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.nombre, "Huerta comunitaria");

  response = await client.get(
    `/api/proyectos/${new mongoose.Types.ObjectId()}`,
  );
  assert.equal(response.status, 404);

  response = await client.get("/api/proyectos/id-malformado");
  assert.equal(response.status, 400);

  response = await client.get(
    `/api/proyectos?organizacion_id=${organizacion._id}`,
  );
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);

  response = await client
    .post("/api/donaciones")
    .send({ donante_id: donante._id, monto: 50 });
  assert.equal(response.status, 201);
  assert.equal(response.body.proyecto_id, undefined);
  response = await client
    .post("/api/gastos")
    .send({ concepto: "Sin proyecto", monto: 1 });
  assert.equal(response.status, 400);

  response = await client.post("/api/donaciones").send({
    donante_id: donante._id,
    proyecto_id: proyecto._id,
    monto: 10000,
  });
  assert.equal(response.status, 201);
  const donacion = response.body;
  assert.ok(donacion.fecha);

  response = await client.get(`/api/proyectos/${proyecto._id}/saldo`);
  assert.equal(response.status, 200);
  assert.equal(response.body.total_donado, 10000);
  assert.equal(response.body.total_gastado, 0);
  assert.equal(response.body.saldo_disponible, 10000);

  response = await client.post("/api/gastos").send({
    proyecto_id: proyecto._id,
    concepto: "Materiales",
    monto: 4000,
  });
  assert.equal(response.status, 201);

  response = await client.get(`/api/proyectos/${proyecto._id}/saldo`);
  assert.equal(response.body.total_donado, 10000);
  assert.equal(response.body.total_gastado, 4000);
  assert.equal(response.body.saldo_disponible, 6000);

  response = await client.post("/api/gastos").send({
    proyecto_id: proyecto._id,
    concepto: "Gasto excesivo",
    monto: 7000,
  });
  assert.equal(response.status, 400);
  assert.match(response.body.mensaje, /supera el saldo disponible/);

  response = await client.get(`/api/proyectos/${proyecto._id}/saldo`);
  assert.equal(response.body.saldo_disponible, 6000);

  response = await client.put(`/api/donaciones/${donacion._id}`).send({
    donante_id: donante._id,
    proyecto_id: proyecto._id,
    monto: 11000,
  });
  assert.equal(response.status, 400);
  assert.match(response.body.mensaje, /ya registró gastos/);

  const otroProyecto = await client.post("/api/proyectos").send({
    nombre: "Taller comunitario",
    descripcion: "Proyecto sin gastos",
    organizacion_id: organizacion._id,
  });
  assert.equal(otroProyecto.status, 201);

  const donacionSecundaria = await client.post("/api/donaciones").send({
    donante_id: donante._id,
    proyecto_id: otroProyecto.body._id,
    monto: 1000,
  });
  assert.equal(donacionSecundaria.status, 201);

  response = await client
    .put(`/api/donaciones/${donacionSecundaria.body._id}`)
    .send({
      donante_id: donante._id,
      proyecto_id: otroProyecto.body._id,
      monto: 1500,
    });
  assert.equal(response.status, 200);
  assert.equal(response.body.monto, 1500);

  response = await client.put(`/api/proyectos/${otroProyecto.body._id}`).send({
    $set: { organizacion_id: new mongoose.Types.ObjectId().toString() },
  });
  assert.equal(response.status, 400);
  response = await client
    .put(`/api/donaciones/${donacionSecundaria.body._id}`)
    .send({ $set: { donante_id: new mongoose.Types.ObjectId().toString() } });
  assert.equal(response.status, 400);

  response = await client.delete(`/api/proyectos/${proyecto._id}`);
  assert.equal(response.status, 400);

  response = await client.delete(`/api/proyectos/${otroProyecto.body._id}`);
  assert.equal(response.status, 400);

  response = await client.get(`/api/proyectos/${proyecto._id}/donaciones`);
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);

  response = await client.get(`/api/proyectos/${proyecto._id}/gastos`);
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);

  const proyectoVacio = await client.post("/api/proyectos").send({
    nombre: "Proyecto sin movimientos",
    descripcion: "Puede eliminarse",
    organizacion_id: organizacion._id,
  });
  response = await client.delete(`/api/proyectos/${proyectoVacio.body._id}`);
  assert.equal(response.status, 200);

  response = await client.post("/api/donantes").send({
    nombre: "Email inválido",
    email: "no-es-email",
  });
  assert.equal(response.status, 400);

  assert.match(
    response.body.mensaje,
    /email.*formato inválido|email.*valor o formato inválido/,
  );

  // Dos gastos simultáneos no pueden consumir más de los 100 disponibles.
  const proyectoConcurrente = await client.post("/api/proyectos").send({
    nombre: "Concurrencia",
    descripcion: "Prueba",
    organizacion_id: organizacion._id,
  });
  await client.post("/api/donaciones").send({
    donante_id: donante._id,
    proyecto_id: proyectoConcurrente.body._id,
    monto: 100,
  });
  const gastosSimultaneos = await Promise.all(
    [1, 2].map(() =>
      client.post("/api/gastos").send({
        proyecto_id: proyectoConcurrente.body._id,
        concepto: "Prueba",
        monto: 70,
      }),
    ),
  );
  assert.deepEqual(gastosSimultaneos.map((r) => r.status).sort(), [201, 400]);
  response = await client.get(
    `/api/proyectos/${proyectoConcurrente.body._id}/saldo`,
  );
  assert.equal(response.body.saldo_disponible, 30);

  response = await client.get("/api/resumen");
  assert.equal(response.body.sin_asignar, 50);
  assert.equal(response.body.total_recibido - response.body.total_asignado, 50);
  assert.equal(response.body.saldo_global - response.body.saldo_proyectos, 50);
  for (const monto of [-1, 0, 1.001, "10", null, 1000000001]) {
    assert.equal(
      (
        await client
          .post("/api/donaciones")
          .send({ donante_id: donante._id, monto })
      ).status,
      400,
    );
  }
  assert.equal(
    (
      await client
        .post("/api/donantes")
        .send({ nombre: "Inyección", email: { $ne: null } })
    ).status,
    400,
  );
  assert.equal(
    (
      await client
        .post("/api/organizaciones")
        .send({ nombre: "X", descripcion: "X", contacto: "X", rol: "admin" })
    ).status,
    400,
  );
  assert.equal(
    (
      await client
        .post("/api/gastos")
        .set("Origin", "https://otro.example")
        .send({ monto: 1 })
    ).status,
    403,
  );
  assert.equal(
    (
      await client
        .post("/api/gastos")
        .set("Content-Type", "application/json")
        .send("{")
    ).status,
    400,
  );
  for (const rol of ["consulta", "operador"]) {
    await Usuario.create({
      nombre: rol,
      email: rol + "@test.org",
      passwordHash: await hash("TestPassword123!"),
      rol,
    });
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: rol + "@test.org", clave: "TestPassword123!" });
    assert.equal((await agent.get("/api/proyectos")).status, 200);
    assert.equal(
      (await agent.delete("/api/proyectos/" + proyecto._id)).status,
      403,
    );
    assert.equal(
      (await agent.put("/api/donaciones/" + donacion._id).send({ monto: 200 }))
        .status,
      403,
    );
    const create = await agent
      .post("/api/donantes")
      .send({ nombre: rol, email: rol + "2@test.org" });
    assert.equal(create.status, rol === "consulta" ? 403 : 201);
  }
  for (const mensaje of ["donar", "saldo", "contacto", "proyectos", "hola"]) {
    const chat = await request(app).post("/api/chat").send({ mensaje });
    assert.equal(chat.status, 200);
    assert.ok(chat.body.respuesta);
  }
  assert.equal(
    (
      await request(app)
        .post("/api/chat")
        .send({ mensaje: "x".repeat(501) })
    ).status,
    400,
  );
  assert.equal((await client.get("/api/auth/me")).body.rol, "admin");
  assert.equal((await client.get("/health")).body.estado, "ok");

  response = await client.get("/api/ruta-inexistente");
  assert.equal(response.status, 404);
  await client.post("/api/auth/logout").send({});
  assert.equal((await client.get("/api/proyectos")).status, 401);
});
