import { chargerConfig } from './config.js';
import { creerBase } from './db/client.js';
import { construireApp } from './app.js';

const config = chargerConfig();
const database = await creerBase(config.enMemoire ? undefined : config.PGLITE_PATH);
const app = await construireApp({ config, database });

try {
  await app.listen({ port: config.PORT, host: config.HOST });
} catch (err) {
  app.log.error(err);
  await database.close();
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await app.close();
    await database.close();
    process.exit(0);
  });
}
