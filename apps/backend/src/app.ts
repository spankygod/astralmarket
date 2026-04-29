import AutoLoad, { type AutoloadPluginOptions } from "@fastify/autoload";
import { join } from "node:path";
import type {
  FastifyError,
  FastifyPluginAsync,
  FastifyServerOptions,
} from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

import { autoloadConfig } from "./config/autoload";
import bagsSyncSchedulerPlugin from "./plugins/bags-sync-scheduler";
import configPlugin from "./plugins/config";
import corsPlugin from "./plugins/cors";
import prismaPlugin from "./plugins/prisma";
import redisPlugin from "./plugins/redis";
import sensiblePlugin from "./plugins/sensible";

export interface AppOptions
  extends FastifyServerOptions, Partial<AutoloadPluginOptions> {}

const options: AppOptions = {};

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts,
): Promise<void> => {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  fastify.setErrorHandler((error: FastifyError, _request, reply) => {
    const statusCode = error.statusCode ?? 500;

    reply.status(statusCode).send({
      success: false,
      error: error.message,
    });
  });

  await fastify.register(configPlugin);
  await fastify.register(sensiblePlugin);
  await fastify.register(corsPlugin);
  await fastify.register(redisPlugin);
  await fastify.register(prismaPlugin);
  await fastify.register(bagsSyncSchedulerPlugin);

  // This loads all route modules using the same Fastify-CLI pattern as Raket.
  await fastify.register(AutoLoad, {
    ...autoloadConfig,
    dir: join(__dirname, "routes"),
    options: opts,
  });
};

export default app;
export { app, options };
