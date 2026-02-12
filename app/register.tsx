import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useWallet } from '@/hooks/use-wallet';
import { generateSecurityPhrase, hashPhrase } from '@/utils/security';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const RegisterScreen = () => {
    const router = useRouter();
    const { register } = useWallet();

    const [step, setStep] = useState(1); // 1: Info, 2: Seed Phrase, 3: Confirm
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
    const [isBusy, setIsBusy] = useState(false);

    const handleNextToPhrase = async () => {
        if (!phoneNumber || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill all fields.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters.');
            return;
        }

        setIsBusy(true);
        const phrase = await generateSecurityPhrase(15);
        setSeedPhrase(phrase);
        setIsBusy(false);
        setStep(2);
    };

    const handleCompleteRegistration = async () => {
        setIsBusy(true);
        try {
            const h = await hashPhrase(seedPhrase);
            await register(phoneNumber, password, h);
            router.replace('/(tabs)');
        } catch (e) {
            Alert.alert('Error', 'Registration failed. Phone number might already be taken.');
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
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <ThemedText type="title" style={styles.title}>Join BlueTransfer</ThemedText>
                        <ThemedText style={styles.subtitle}>Create your secure offline wallet</ThemedText>
                    </View>

                    {step === 1 && (
                        <View style={styles.card}>
                            <View style={styles.inputGroup}>
                                <ThemedText style={styles.label}>Phone Number</ThemedText>
                                <TextInput
                                    style={styles.input}
                                    placeholder="98XXXXXXXX"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="phone-pad"
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <ThemedText style={styles.label}>Create Password</ThemedText>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Min 6 characters"
                                    placeholderTextColor="#94A3B8"
                                    secureTextEntry
                                    value={password}
                                    onChangeText={setPassword}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <ThemedText style={styles.label}>Confirm Password</ThemedText>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Repeat password"
                                    placeholderTextColor="#94A3B8"
                                    secureTextEntry
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={handleNextToPhrase}
                                disabled={isBusy}
                            >
                                {isBusy ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Generate Security Phrase</ThemedText>}
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => router.back()}>
                                <ThemedText style={styles.linkText}>Already have a wallet? Login</ThemedText>
                            </TouchableOpacity>
                        </View>
                    )}

                    {step === 2 && (
                        <View style={styles.card}>
                            <ThemedText style={styles.warningTitle}>⚠️ Important: Save This!</ThemedText>
                            <ThemedText style={styles.warningText}>
                                These 15 words are the ONLY way to recover your wallet if you forget your password. Write them down on paper.
                            </ThemedText>

                            <View style={styles.phraseContainer}>
                                {seedPhrase.map((word, i) => (
                                    <View key={i} style={styles.wordBadge}>
                                        <ThemedText style={styles.wordNumber}>{i + 1}</ThemedText>
                                        <ThemedText style={styles.wordText}>{word}</ThemedText>
                                    </View>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={() => setStep(3)}
                            >
                                <ThemedText style={styles.buttonText}>I Have Stored These Words</ThemedText>
                            </TouchableOpacity>
                        </View>
                    )}

                    {step === 3 && (
                        <View style={styles.card}>
                            <ThemedText style={styles.confirmTitle}>Final Verification</ThemedText>
                            <ThemedText style={styles.confirmText}>
                                By clicking below, you confirm that you have safely stored your 15-word security phrase. You cannot reset your password without it.
                            </ThemedText>

                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={handleCompleteRegistration}
                                disabled={isBusy}
                            >
                                {isBusy ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Finish Registration</ThemedText>}
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setStep(2)}>
                                <ThemedText style={styles.linkText}>Go back to view words</ThemedText>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </ThemedView>
        </KeyboardAvoidingView>
    );
};

export default RegisterScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    scrollContent: {
        padding: 30,
        paddingTop: 80,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#F8FAFC',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
        marginTop: 8,
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#1E293B',
        borderRadius: 24,
        padding: 24,
        gap: 20,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
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
        borderRadius: 12,
        padding: 16,
        color: '#F8FAFC',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    primaryButton: {
        backgroundColor: '#3B82F6',
        padding: 18,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
    linkText: {
        color: '#94A3B8',
        textAlign: 'center',
        fontSize: 14,
        marginTop: 10,
    },
    warningTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#F59E0B',
        textAlign: 'center',
    },
    warningText: {
        color: '#CBD5E1',
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 20,
    },
    phraseContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
        marginVertical: 10,
    },
    wordBadge: {
        backgroundColor: '#0F172A',
        flexDirection: 'row',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#1E40AF',
        alignItems: 'center',
    },
    wordNumber: {
        color: '#3B82F6',
        fontSize: 12,
        fontWeight: 'bold',
        marginRight: 6,
    },
    wordText: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '600',
    },
    confirmTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#10B981',
        textAlign: 'center',
    },
    confirmText: {
        color: '#CBD5E1',
        textAlign: 'center',
        fontSize: 15,
        lineHeight: 22,
    }
});
