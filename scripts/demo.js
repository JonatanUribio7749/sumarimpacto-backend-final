// Base temporal real de MongoDB: se elimina al cerrar. No sustituye Atlas en la entrega.
require("dotenv").config();
const { randomBytes } = require("node:crypto");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
(async () => {
  process.env.NODE_ENV = "development";
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  process.env.ADMIN_EMAIL = "admin@example.org";
  process.env.ADMIN_PASSWORD = "Demo-" + randomBytes(8).toString("hex");
  process.env.PORT = process.env.PORT || "3000";
  process.env.APP_ORIGIN = "http://localhost:" + process.env.PORT;
  const mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    instanceOpts: [
      { args: process.platform === "win32" ? [] : ["--nounixsocket"] },
    ],
  });
  await require("../config/db")(mongo.getUri());
  await require("./seed")();
  const server = require("../app").listen(process.env.PORT, () =>
    console.log(
      `Demo TEMPORAL: http://localhost:${process.env.PORT}\nEmail: ${process.env.ADMIN_EMAIL}\nClave: ${process.env.ADMIN_PASSWORD}\nAl cerrar se pierden los datos.`,
    ),
  );
  process.on("SIGINT", async () => {
    server.close();
    await require("mongoose").disconnect();
    await mongo.stop();
    process.exit(0);
  });
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
