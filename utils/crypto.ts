import * as base64 from 'base64-js';
import { Buffer } from 'buffer';
import * as Crypto from 'expo-crypto';
import nacl from 'tweetnacl';
import './polyfill';

export async function sha256(data: string): Promise<string> {
    const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data
    );
    return digest;
}

export function generateKeypair() {
    const pair = nacl.sign.keyPair();
    return {
        publicKey: base64.fromByteArray(pair.publicKey),
        secretKey: base64.fromByteArray(pair.secretKey),
    };
}

export function signData(data: string, secretKeyBase64: string): string {
    const secretKey = base64.toByteArray(secretKeyBase64);
    const message = Buffer.from(data);
    const signature = nacl.sign.detached(message, secretKey);
    return base64.fromByteArray(signature);
}

export function verifySignature(data: string, signatureBase64: string, publicKeyBase64: string): boolean {
    try {
        const publicKey = base64.toByteArray(publicKeyBase64);
        const signature = base64.toByteArray(signatureBase64);
        const message = Buffer.from(data);
        return nacl.sign.detached.verify(message, signature, publicKey);
    } catch (e) {
        return false;
    }
}

export function generateNonce(): string {
    return base64.fromByteArray(nacl.randomBytes(16));
}
