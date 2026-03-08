"use client";

// Genera un buffer aleatorio para los challenges
function generateRandomBuffer(length = 32): Uint8Array {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return arr;
}

// Convertir base64url a buffer
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const charCode of bytes) {
    str += String.fromCharCode(charCode);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlToBuffer(base64url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function isBiometricsSupported(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    const isAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return isAvailable;
  } catch {
    return false;
  }
}

export async function registerLocalBiometrics(username: string): Promise<string | null> {
  try {
    const challenge = generateRandomBuffer(32);
    const userId = generateRandomBuffer(16);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: challenge as unknown as BufferSource,
        rp: {
          name: "Financia",
        },
        user: {
          id: userId as unknown as BufferSource,
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // Requires built-in sensor (TouchID/FaceID)
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "none",
      },
    }) as PublicKeyCredential;

    if (!credential) return null;
    
    // Guardamos el ID de la credencial localmente, se usa para pedir desbloqueo
    const credId = bufferToBase64Url(credential.rawId);
    return credId;
  } catch (error) {
    console.error("Biometrics Registration Error:", error);
    return null;
  }
}

export async function verifyLocalBiometrics(credentialIdBase64: string): Promise<boolean> {
  try {
    const challenge = generateRandomBuffer(32);
    const credentialIdBuffer = base64UrlToBuffer(credentialIdBase64);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge as unknown as BufferSource,
        allowCredentials: [
          {
            type: "public-key",
            id: credentialIdBuffer as unknown as BufferSource,
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    });

    return !!assertion;
  } catch (error) {
    console.error("Biometrics Verification Error:", error);
    return false;
  }
}
