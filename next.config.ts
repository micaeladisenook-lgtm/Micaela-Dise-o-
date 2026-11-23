import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // fotos de la galería y restauración de copias de seguridad
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
