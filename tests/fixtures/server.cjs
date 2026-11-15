process.env.JWT_SECRET = "distributed-test-secret-longer-than-32-characters";
(async () => {
  if (!process.env.LAZY_CONNECT) await require("../../config/db")();
  const server = require("../../app").listen(0, "127.0.0.1", () =>
    process.send({ port: server.address().port }),
  );
  process.on("message", async (msg) => {
    if (msg === "stop") {
      server.close();
      await require("mongoose").disconnect();
      process.exit(0);
    }
  });
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
