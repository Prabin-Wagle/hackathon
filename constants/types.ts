export interface MoneyToken {
    token_id: string; // UUID
    amount: number;
    issuer_signature: string; // Signed by "Mint" (for demo, we'll self-sign or pre-load)
    last_sender: string; // User ID
    allowed_next?: string[]; // Peer restriction list
    timestamp_sent: number;
    cooldown_until: number;
    hash_chain: string; // SHA-256 of the previous state
}

export interface WalletState {
    balance: number;
    tokens: MoneyToken[];
    transactionLogs: TransactionEntry[];
    publicKey: string;
    privateKey?: string; // Encrypted
}

export interface TransactionEntry {
    id: string;
    type: 'SEND' | 'RECEIVE';
    peerId: string;
    amount: number;
    timestamp: number;
    tokenIds: string[];
    currentHash: string;
    previousHash: string;
}

export interface HandshakeChallenge {
    peerId: string;
    nonce: string;
    sessionPublicKey: string; // Ephemeral
}
