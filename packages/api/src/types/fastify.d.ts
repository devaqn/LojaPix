import '@fastify/jwt';

declare module 'fastify' {
  interface FastifyRequest {
    adminUserId: string;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}
