import { loadLocalEnvIfNeeded } from "./config/load-local-env";
loadLocalEnvIfNeeded();

import { app } from "./index";

const port = Number(process.env.SALES_PORTAL_API_PORT || 8071);

app.listen(port, "127.0.0.1", () => {
  console.log(`Sales Portal API listening on http://127.0.0.1:${port}`);
  console.log(`Health: http://127.0.0.1:${port}/health`);
});
