import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useWallet } from '@/hooks/use-wallet';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
    const router = useRouter();
    const { login, biometricLogin, biometricsAvailable, biometricsEnabled } = useWallet();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [isBusy, setIsBusy] = useState(false);

    useEffect(() => {
        // Auto-trigger biometrics if enabled for returning user
        if (biometricsAvailable && biometricsEnabled) {
            handleBiometricLogin();
        }
    }, [biometricsAvailable, biometricsEnabled]);

    const handleLogin = async () => {
        if (!phoneNumber || !password) {
            Alert.alert('Missing Info', 'Please enter both phone number and password.');
            return;
        }

        setIsBusy(true);
        try {
            await login(phoneNumber, password);
            router.replace('/(tabs)');
        } catch (e: any) {
            Alert.alert('Login Failed', e.message || 'Failed to login to wallet.');
        } finally {
            setIsBusy(false);
        }
    };

    const handleBiometricLogin = async () => {
        setIsBusy(true);
        try {
            await biometricLogin();
            router.replace('/(tabs)');
        } catch (e: any) {
            Alert.alert('Biometric Error', e.message || 'Authentication failed.');
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ThemedView style={styles.container}>
                <View style={styles.header}>
                    <Image
                        source={require('@/assets/images/partial-react-logo.png')}
                        style={styles.logo}
                    />
                    <ThemedText type="title" style={styles.title}>BlueTransfer</ThemedText>
                    <ThemedText style={styles.subtitle}>Secure Offline Payments</ThemedText>
                </View>

                <View style={styles.card}>
                    <View style={styles.inputGroup}>
                        <ThemedText style={styles.label}>Phone Number</ThemedText>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 98XXXXXXXX"
                            placeholderTextColor="#94A3B8"
                            keyboardType="phone-pad"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <ThemedText style={styles.label}>Password / PIN</ThemedText>
                        <TextInput
                            style={styles.input}
                            placeholder="6+ characters"
                            placeholderTextColor="#94A3B8"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleLogin}
                            disabled={isBusy}
                        >
                            {isBusy ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <ThemedText style={styles.loginButtonText}>Access Wallet</ThemedText>
                            )}
                        </TouchableOpacity>

                        {(biometricsAvailable && biometricsEnabled) && (
                            <TouchableOpacity
                                style={styles.biometricButton}
                                onPress={handleBiometricLogin}
                                disabled={isBusy}
                            >
                                <ThemedText style={styles.biometricIcon}>🧬</ThemedText>
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity onPress={() => router.push('/register')}>
                        <ThemedText style={styles.registerLink}>New user? Create Secure Wallet</ThemedText>
                    </TouchableOpacity>

                    <ThemedText style={styles.hint}>
                        Wallet keys are generated offline and stored locally in a secure database on this device.
                    </ThemedText>
                </View>

                <View style={styles.footer}>
                    <ThemedText style={styles.footerText}>Secure Ed25519 Encryption</ThemedText>
                </View>
            </ThemedView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 30,
        justifyContent: 'center',
        backgroundColor: '#0F172A',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 16,
        opacity: 0.9,
    },
    title: {
        fontSize: 36,
        fontWeight: '800',
        color: '#F8FAFC',
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
        marginTop: 4,
    },
    card: {
        backgroundColor: '#1E293B',
        borderRadius: 28,
        padding: 24,
        gap: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 8,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#CBD5E1',
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#0F172A',
        borderRadius: 14,
        padding: 18,
        color: '#F8FAFC',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
    },
    loginButton: {
        backgroundColor: '#3B82F6',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        flex: 3,
    },
    biometricButton: {
        backgroundColor: '#334155',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    biometricIcon: {
        fontSize: 24,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    registerLink: {
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 5,
        fontSize: 15,
        textDecorationLine: 'underline',
    },
    hint: {
        textAlign: 'center',
        color: '#64748B',
        fontSize: 12,
        marginTop: 8,
        lineHeight: 18,
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    footerText: {
        color: '#475569',
        fontSize: 11,
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
});
