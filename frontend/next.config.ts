import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Configuração de segurança para o seu IP de Pinhais */
  allowedDevOrigins: ['192.168.18.23'],
};

export default nextConfig;
