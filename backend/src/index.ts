import app from "./app.js";

const port = Number(process.env.PORT) || 3000;
// ponytail: 0.0.0.0 so a Pi on the LAN can reach the API; HOST=127.0.0.1 for local-only
const host = process.env.HOST ?? "0.0.0.0";
app.listen(port, host, () => {
  console.log(`greenhouse api on http://${host}:${port}`);
});
