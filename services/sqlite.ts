import * as SQLite from 'expo-sqlite';
import { MoneyToken, TransactionEntry } from '../constants/types';

const DB_NAME = 'wallet.db';

export class SQLiteService {
    private db: SQLite.SQLiteDatabase | null = null;

    async init() {
        if (this.db) return;
        this.db = await SQLite.openDatabaseAsync(DB_NAME);

        // Create tables
        await this.db.execAsync(`
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS wallet_profile (
                phoneNumber TEXT PRIMARY KEY,
                balance REAL DEFAULT 0,
                publicKey TEXT,
                privateKey TEXT,
                passwordHash TEXT,
                securityPhraseHash TEXT,
                biometricsEnabled INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                type TEXT,
                peerId TEXT,
                amount REAL,
                timestamp INTEGER,
                tokenIds TEXT,
                currentHash TEXT,
                previousHash TEXT
            );
            CREATE TABLE IF NOT EXISTS tokens (
                token_id TEXT PRIMARY KEY,
                amount REAL,
                issuer_signature TEXT,
                last_sender TEXT,
                timestamp_sent INTEGER,
                cooldown_until INTEGER,
                hash_chain TEXT
            );
        `);
        console.log('SQLite Database initialized');
    }

    async getWalletProfile(phoneNumber: string): Promise<any | null> {
        if (!this.db) await this.init();
        const result = await this.db!.getFirstAsync<any>('SELECT * FROM wallet_profile WHERE phoneNumber = ?', [phoneNumber]);
        return result || null;
    }

    async saveWalletProfile(profile: {
        phoneNumber: string,
        balance: number,
        publicKey: string,
        privateKey: string,
        passwordHash: string,
        securityPhraseHash: string,
        biometricsEnabled: number
    }) {
        if (!this.db) await this.init();
        await this.db!.runAsync(
            'INSERT OR REPLACE INTO wallet_profile (phoneNumber, balance, publicKey, privateKey, passwordHash, securityPhraseHash, biometricsEnabled) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [profile.phoneNumber, profile.balance, profile.publicKey, profile.privateKey, profile.passwordHash, profile.securityPhraseHash, profile.biometricsEnabled]
        );
    }

    async updateBalance(phoneNumber: string, newBalance: number) {
        if (!this.db) await this.init();
        await this.db!.runAsync('UPDATE wallet_profile SET balance = ? WHERE phoneNumber = ?', [newBalance, phoneNumber]);
    }

    async addTransaction(tx: TransactionEntry) {
        if (!this.db) await this.init();
        await this.db!.runAsync(
            'INSERT INTO transactions (id, type, peerId, amount, timestamp, tokenIds, currentHash, previousHash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [tx.id, tx.type, tx.peerId, tx.amount, tx.timestamp, JSON.stringify(tx.tokenIds), tx.currentHash, tx.previousHash]
        );
    }

    async getTransactions(): Promise<TransactionEntry[]> {
        if (!this.db) await this.init();
        const rows = await this.db!.getAllAsync<any>('SELECT * FROM transactions ORDER BY timestamp DESC');
        return rows.map(row => ({
            ...row,
            tokenIds: JSON.parse(row.tokenIds)
        }));
    }

    async saveTokens(tokens: MoneyToken[]) {
        if (!this.db) await this.init();
        // Clear and reload for now, or use transaction
        await this.db!.withTransactionAsync(async () => {
            await this.db!.runAsync('DELETE FROM tokens');
            for (const t of tokens) {
                await this.db!.runAsync(
                    'INSERT INTO tokens (token_id, amount, issuer_signature, last_sender, timestamp_sent, cooldown_until, hash_chain) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [t.token_id, t.amount, t.issuer_signature, t.last_sender, t.timestamp_sent, t.cooldown_until, t.hash_chain]
                );
            }
        });
    }

    async getTokens(): Promise<MoneyToken[]> {
        if (!this.db) await this.init();
        return await this.db!.getAllAsync<MoneyToken>('SELECT * FROM tokens');
    }

    async clearAll() {
        if (!this.db) await this.init();
        await this.db!.execAsync(`
            DELETE FROM wallet_profile;
            DELETE FROM transactions;
            DELETE FROM tokens;
        `);
    }
}

export const sqliteService = new SQLiteService();
