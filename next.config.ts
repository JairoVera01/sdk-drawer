import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Permite que /embed se muestre dentro de un <iframe> desde cualquier
        // sitio. Para el MVP (maqueta pública) se permite de forma amplia.
        // Cuando haya lógica real, restringir a una allowlist de dominios,
        // p. ej. "frame-ancestors 'self' https://tudominio.com".
        source: '/embed',
        headers: [{ key: 'Content-Security-Policy', value: 'frame-ancestors *' }],
      },
    ];
  },
};

export default nextConfig;
