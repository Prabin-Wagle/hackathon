import * as Crypto from 'expo-crypto';
import nacl from 'tweetnacl';

// Polyfill for global.crypto.getRandomValues
if (typeof global.crypto !== 'object') {
    (global as any).crypto = {};
}

if (typeof global.crypto.getRandomValues !== 'function') {
    (global as any).crypto.getRandomValues = (array: Uint8Array) => {
        const bytes = Crypto.getRandomBytes(array.length);
        for (let i = 0; i < array.length; i++) {
            array[i] = bytes[i];
        }
        return array;
    };
}

// Explicitly set nacl PRNG for tweetnacl library
// This is the most robust way to ensure nacl has a source of randomness
nacl.setPRNG((x, n) => {
    const bytes = Crypto.getRandomBytes(n);
    for (let i = 0; i < n; i++) {
        x[i] = bytes[i];
    }
});

console.log('PRNG Polyfill for tweetnacl applied successfully.');
