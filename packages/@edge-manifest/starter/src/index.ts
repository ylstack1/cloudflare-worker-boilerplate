import { createApp } from './app';
import type { Bindings } from './types';

let cachedApp: ReturnType<typeof createApp> | undefined;
let cachedEnv: Bindings | undefined;

export default {
  fetch(request: Request, env: Bindings): Promise<Response> {
    if (!cachedApp || cachedEnv !== env) {
      cachedEnv = env;
      cachedApp = createApp(env);
    }

    return cachedApp.handle(request);
  },
};
