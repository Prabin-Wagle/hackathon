import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TransactionEntry, WalletState } from '../constants/types';
import { generateKeypair } from '../utils/crypto';

export function useWallet() {
    const [wallet, setWallet] = useState<WalletState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

    useEffect(() => {
        loadWallet();
    }, []);

    const loadWallet = async () => {
        try {
            const storedPhone = await AsyncStorage.getItem('user_phone');
            const storedWallet = await AsyncStorage.getItem('user_wallet');

            if (storedPhone) {
                setPhoneNumber(storedPhone);
            }

            if (storedWallet) {
                setWallet(JSON.parse(storedWallet));
            }
        } catch (e) {
            console.error('Failed to load wallet', e);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (phone: string, password: string) => {
        // For hackathon: simple static check or create if new
        await AsyncStorage.setItem('user_phone', phone);
        setPhoneNumber(phone);

        let currentWallet = await AsyncStorage.getItem('user_wallet');
        if (!currentWallet) {
            // Initialize new wallet for new user
            const keys = generateKeypair();
            const initialWallet: WalletState = {
                balance: 1000, // Starting balance for demo
                tokens: [
                    {
                        token_id: uuidv4(),
                        amount: 1000,
                        issuer_signature: 'MINT_SIG',
                        last_sender: 'SYSTEM',
                        timestamp_sent: Date.now(),
                        cooldown_until: 0,
                        hash_chain: 'GENESIS',
                    }
                ],
                transactionLogs: [],
                publicKey: keys.publicKey,
                privateKey: keys.secretKey, // In real app, encrypt this with password
            };
            await AsyncStorage.setItem('user_wallet', JSON.stringify(initialWallet));
            setWallet(initialWallet);
        } else {
            setWallet(JSON.parse(currentWallet));
        }
    };

    const logout = async () => {
        await AsyncStorage.removeItem('user_phone');
        // We keep the wallet data on device for offline use, 
        // but clear the session state.
        setPhoneNumber(null);
    };

    const addTransaction = async (entry: TransactionEntry) => {
        if (!wallet) return;

        const updatedWallet = {
            ...wallet,
            transactionLogs: [entry, ...wallet.transactionLogs],
            balance: entry.type === 'RECEIVE' ? wallet.balance + entry.amount : wallet.balance - entry.amount,
        };

        setWallet(updatedWallet);
        await AsyncStorage.setItem('user_wallet', JSON.stringify(updatedWallet));
    };

    return {
        wallet,
        phoneNumber,
        isLoading,
        login,
        logout,
        addTransaction,
        isLoggedIn: !!phoneNumber,
    };
}
