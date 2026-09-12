import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { readConfig } from "./config";
import { configureApp } from "./configure-app";

async function bootstrap() {
  const config = readConfig();
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks();
  await app.listen(config.port, "0.0.0.0");
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
