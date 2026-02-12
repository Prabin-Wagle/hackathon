import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { TransactionEntry, WalletState } from '../constants/types';
import { sqliteService } from '../services/sqlite';
import { generateKeypair, sha256 } from '../utils/crypto';
import '../utils/polyfill';

interface WalletContextType {
    wallet: WalletState | null;
    phoneNumber: string | null;
    isLoading: boolean;
    isLoggedIn: boolean;
    biometricsAvailable: boolean;
    biometricsEnabled: boolean;
    login: (phone: string, password: string) => Promise<void>;
    register: (phone: string, password: string, phraseHash: string) => Promise<void>;
    logout: () => Promise<void>;
    addTransaction: (entry: TransactionEntry) => Promise<void>;
    topUp: (amountBTC: number) => Promise<void>;
    toggleBiometrics: (enabled: boolean) => Promise<void>;
    biometricLogin: () => Promise<void>;
    nprToBtc: (npr: number) => number;
    btcToNpr: (btc: number) => number;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const [wallet, setWallet] = useState<WalletState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
    const [biometricsAvailable, setBiometricsAvailable] = useState(false);
    const [biometricsEnabled, setBiometricsEnabled] = useState(false);

    useEffect(() => {
        loadSession();
        checkBiometrics();
    }, []);

    const checkBiometrics = async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricsAvailable(hasHardware && isEnrolled);
    };

    const loadSession = async () => {
        try {
            await sqliteService.init();
            const storedPhone = await AsyncStorage.getItem('user_phone');

            if (storedPhone) {
                const profile = await sqliteService.getWalletProfile(storedPhone);
                if (profile) {
                    setPhoneNumber(storedPhone);
                    setBiometricsEnabled(profile.biometricsEnabled === 1);
                    const txs = await sqliteService.getTransactions();
                    const tokens = await sqliteService.getTokens();

                    setWallet({
                        balance: profile.balance,
                        publicKey: profile.publicKey,
                        privateKey: profile.privateKey,
                        tokens: tokens,
                        transactionLogs: txs
                    });
                } else {
                    await AsyncStorage.removeItem('user_phone');
                }
            }
        } catch (e) {
            console.error('Failed to load session from SQLite', e);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (phone: string, password: string) => {
        try {
            const profile = await sqliteService.getWalletProfile(phone);

            if (!profile) {
                if (phone === '9800000000') {
                    await register(phone, password, 'DUMMY_PHRASE_HASH');
                    return;
                }
                throw new Error('User not found');
            }

            const inputHash = await sha256(password);
            if (profile.passwordHash !== inputHash) {
                throw new Error('Invalid password');
            }

            const txs = await sqliteService.getTransactions();
            const tokens = await sqliteService.getTokens();

            setPhoneNumber(phone);
            setBiometricsEnabled(profile.biometricsEnabled === 1);
            setWallet({
                balance: profile.balance,
                publicKey: profile.publicKey,
                privateKey: profile.privateKey,
                tokens: tokens,
                transactionLogs: txs
            });
            await AsyncStorage.setItem('user_phone', phone);
            await AsyncStorage.setItem('last_user_phone', phone);
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const biometricLogin = async () => {
        const storedPhone = await AsyncStorage.getItem('last_user_phone');
        if (!storedPhone) throw new Error('No saved account for biometric login');

        const profile = await sqliteService.getWalletProfile(storedPhone);
        if (!profile || profile.biometricsEnabled !== 1) {
            throw new Error('Biometrics not enabled for this account');
        }

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Login to BlueTransfer',
            fallbackLabel: 'Use Password',
        });

        if (result.success) {
            const txs = await sqliteService.getTransactions();
            const tokens = await sqliteService.getTokens();

            setPhoneNumber(storedPhone);
            setWallet({
                balance: profile.balance,
                publicKey: profile.publicKey,
                privateKey: profile.privateKey,
                tokens: tokens,
                transactionLogs: txs
            });
            await AsyncStorage.setItem('user_phone', storedPhone);
        } else {
            throw new Error('Biometric authentication failed');
        }
    };

    const register = async (phone: string, password: string, phraseHash: string) => {
        try {
            const keys = generateKeypair();
            const passwordHash = await sha256(password);

            const initialBalance = 1000;
            const profile = {
                phoneNumber: phone,
                balance: initialBalance,
                publicKey: keys.publicKey,
                privateKey: keys.secretKey,
                passwordHash: passwordHash,
                securityPhraseHash: phraseHash,
                biometricsEnabled: 0
            };

            await sqliteService.saveWalletProfile(profile);

            const genesisToken = {
                token_id: Crypto.randomUUID(),
                amount: initialBalance,
                issuer_signature: 'MINT_SIG',
                last_sender: 'SYSTEM',
                timestamp_sent: Date.now(),
                cooldown_until: 0,
                hash_chain: 'GENESIS',
            };
            await sqliteService.saveTokens([genesisToken]);

            setPhoneNumber(phone);
            setBiometricsEnabled(false);
            setWallet({
                balance: initialBalance,
                publicKey: keys.publicKey,
                privateKey: keys.secretKey,
                tokens: [genesisToken],
                transactionLogs: []
            });
            await AsyncStorage.setItem('user_phone', phone);
            await AsyncStorage.setItem('last_user_phone', phone);
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    };

    const toggleBiometrics = async (enabled: boolean) => {
        if (!phoneNumber || !wallet) return;
        const profile = await sqliteService.getWalletProfile(phoneNumber);
        if (profile) {
            profile.biometricsEnabled = enabled ? 1 : 0;
            await sqliteService.saveWalletProfile(profile);
            setBiometricsEnabled(enabled);
        }
    };

    const logout = async () => {
        try {
            if (phoneNumber) {
                await AsyncStorage.setItem('last_user_phone', phoneNumber);
            }
            await AsyncStorage.removeItem('user_phone');
            setPhoneNumber(null);
            setWallet(null);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const addTransaction = async (entry: TransactionEntry) => {
        if (!wallet || !phoneNumber) return;
        try {
            await sqliteService.addTransaction(entry);
            const newBalance = entry.type === 'RECEIVE' ? wallet.balance + entry.amount : wallet.balance - entry.amount;
            await sqliteService.updateBalance(phoneNumber, newBalance);

            setWallet({
                ...wallet,
                balance: newBalance,
                transactionLogs: [entry, ...wallet.transactionLogs]
            });
        } catch (error) {
            console.error('Failed to add transaction:', error);
        }
    };

    const topUp = async (amountBTC: number) => {
        if (!wallet || !phoneNumber) return;
        try {
            const newBalance = wallet.balance + amountBTC;
            await sqliteService.updateBalance(phoneNumber, newBalance);
            setWallet({ ...wallet, balance: newBalance });
        } catch (error) {
            console.error('Top-up failed:', error);
        }
    };

    const nprToBtc = (npr: number) => npr;
    const btcToNpr = (btc: number) => btc;

    const value = {
        wallet,
        phoneNumber,
        isLoading,
        isLoggedIn: !!phoneNumber,
        biometricsAvailable,
        biometricsEnabled,
        login,
        register,
        logout,
        addTransaction,
        topUp,
        toggleBiometrics,
        biometricLogin,
        nprToBtc,
        btcToNpr,
    };

    return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
}
