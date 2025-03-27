const encoder = new TextEncoder();

export async function sha256(input: string) {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return arrayBufferToHexString(hash);
}

interface GenerateHmacOptions {
  payload: string;
  timestamp: number;
  secret: string;
}

export async function generateHmac({
  payload,
  timestamp,
  secret,
}: GenerateHmacOptions) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}:${payload}`)
  );

  return arrayBufferToHexString(signature);
}

interface VerifyHmacOptions extends GenerateHmacOptions {
  signature: string;
}

export async function verifyHmac({
  payload,
  timestamp,
  signature,
  secret,
}: VerifyHmacOptions) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  return await crypto.subtle.verify(
    "HMAC",
    key,
    hexStringToArrayBuffer(signature),
    encoder.encode(`${timestamp}:${payload}`)
  );
}

function arrayBufferToHexString(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexStringToArrayBuffer(hexString: string): ArrayBuffer {
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}
