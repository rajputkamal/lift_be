import app from "../app.js";
import mongoose from "mongoose";
import connectDB from "./config/db.js";

await connectDB();
app.locals.ready = true;
mongoose.connection.on("disconnected", () => {
  app.locals.ready = false;
});
mongoose.connection.on("connected", () => {
  if (!stopping) app.locals.ready = true;
});
const server = app.listen(process.env.PORT || 8080, "0.0.0.0", () => {
  console.log(
    JSON.stringify({ event: "listening", service: app.locals.serviceMode }),
  );
});
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  app.locals.ready = false;
  console.log(
    JSON.stringify({ event: "shutdown", service: app.locals.serviceMode }),
  );
  const deadline = setTimeout(() => process.exit(1), 8000);
  deadline.unref();
  server.close(async () => {
    await mongoose.disconnect();
    clearTimeout(deadline);
  });
  server.closeIdleConnections?.();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
