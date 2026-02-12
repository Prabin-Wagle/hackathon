import * as Crypto from 'expo-crypto';

// A simple list of 50 common words for the demo. 
// In a real app, this would be 2048 words (BIP-39).
const WORD_LIST = [
    "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse",
    "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act",
    "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit",
    "adult", "advance", "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent",
    "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert"
];

export async function generateSecurityPhrase(length: number = 15): Promise<string[]> {
    const phrase: string[] = [];
    for (let i = 0; i < length; i++) {
        // Use crypto for random index selection
        const randomBytes = await Crypto.getRandomBytesAsync(4);
        const view = new DataView(randomBytes.buffer);
        const randomIndex = view.getUint32(0) % WORD_LIST.length;
        phrase.push(WORD_LIST[randomIndex]);
    }
    return phrase;
}

export async function hashPhrase(phrase: string[]): Promise<string> {
    const text = phrase.join(' ').toLowerCase().trim();
    const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        text
    );
    return hash;
}
