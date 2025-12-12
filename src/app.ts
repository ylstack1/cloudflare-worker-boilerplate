import { Elysia } from 'elysia';
import type { Bindings } from './types';

type Plugin = (app: Elysia) => Elysia;

function cors(): Plugin {
  return (app) => app;
}

function openapi(_options: unknown): Plugin {
  return (app) => app;
}

export function app(env: Bindings) {
  const openapiDocumentationRoute = '/openapi.json';
  const scalarPlugin = openapi({
    path: '/schema/scalar',
    scalar: { url: openapiDocumentationRoute },
    specPath: openapiDocumentationRoute,
    documentation: {
      info: {
        title: 'worker',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  return new Elysia().decorate('env', env).use(scalarPlugin).use(cors());
}
