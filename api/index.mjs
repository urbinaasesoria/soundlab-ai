/**
 * Vercel Serverless Function — Entrypoint API
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 */
import { handleRequest } from "../server/gemini-proxy.mjs";

export default function handler(req, res) {
  return handleRequest(req, res);
}

