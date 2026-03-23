import * as grpc from "@grpc/grpc-js";
import { readFileSync } from "node:fs";
import forge from "node-forge";

export interface TlsPaths {
  certPath: string;
  keyPath: string;
  caPath: string;
}

export interface GeneratedCert {
  cert: string;
  key: string;
}

/**
 * Load TLS/mTLS credentials from file paths and return gRPC channel credentials.
 */
export function loadTlsCredentials(paths: TlsPaths): grpc.ChannelCredentials {
  const rootCert = readFileSync(paths.caPath);
  const clientCert = readFileSync(paths.certPath);
  const clientKey = readFileSync(paths.keyPath);

  return grpc.credentials.createSsl(rootCert, clientKey, clientCert);
}

/**
 * Generate a self-signed certificate for development/bootstrap use.
 * Uses node-forge to create a 2048-bit RSA key pair and a cert valid for 365 days.
 */
export function generateSelfSignedCert(runtimeId: string): GeneratedCert {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";

  const now = new Date();
  cert.validity.notBefore = now;
  cert.validity.notAfter = new Date(
    now.getTime() + 365 * 24 * 60 * 60 * 1000,
  );

  const attrs: any[] = [
    { name: "commonName", value: `nexus-runtime-${runtimeId}` },
    { name: "organizationName", value: "Nexus" },
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  cert.setExtensions([
    { name: "basicConstraints", cA: false },
    {
      name: "keyUsage",
      digitalSignature: true,
      keyEncipherment: true,
    },
    {
      name: "extKeyUsage",
      clientAuth: true,
    },
    {
      name: "subjectAltName",
      altNames: [
        { type: 2, value: "localhost" }, // DNS
        { type: 7, ip: "127.0.0.1" }, // IP
      ],
    },
  ]);

  // Self-sign
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const pemCert = forge.pki.certificateToPem(cert);
  const pemKey = forge.pki.privateKeyToPem(keys.privateKey);

  return { cert: pemCert, key: pemKey };
}

/**
 * Request a client certificate from the hub's built-in CA.
 * This is a stub; the real implementation would generate a CSR,
 * send it to the hub's certificate-signing endpoint, and receive
 * back a signed client cert.
 */
export async function requestCertFromHub(
  _hubUrl: string,
  _runtimeId: string,
): Promise<GeneratedCert | null> {
  // Stub: in production, this would:
  // 1. Generate a CSR using node-forge
  // 2. POST the CSR to https://<hubUrl>/api/v1/certs/sign
  // 3. Receive the signed certificate back
  // 4. Return { cert, key }
  return null;
}

/**
 * Determine the appropriate gRPC channel credentials based on the
 * runtime configuration. Returns mTLS credentials if cert paths are
 * provided, otherwise insecure for development.
 */
export function resolveCredentials(config: {
  tls_cert_path: string;
  tls_key_path: string;
  ca_cert_path: string;
}): grpc.ChannelCredentials {
  if (config.tls_cert_path && config.tls_key_path && config.ca_cert_path) {
    return loadTlsCredentials({
      certPath: config.tls_cert_path,
      keyPath: config.tls_key_path,
      caPath: config.ca_cert_path,
    });
  }

  return grpc.credentials.createInsecure();
}
