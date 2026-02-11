import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'teacher' | 'student'>('student');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) {
            Alert.alert('Error', 'Please enter both username and password');
            return;
        }

        setLoading(true);
        // Simulate API call
        setTimeout(async () => {
            // Dummy Credentials logic
            const isTeacher = role === 'teacher' && username === 'admin' && password === 'admin123';
            const isStudent = role === 'student' && username === 'student' && password === 'student123';

            if (isTeacher || isStudent) {
                await login(username, role);
                router.replace('/(tabs)');
            } else {
                Alert.alert('Invalid Credentials', 'Please check your role, username, and password.');
            }
            setLoading(false);
        }, 1000);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ThemedView style={styles.container}>
                <View style={styles.headerContainer}>
                    <ThemedText type="title" style={styles.title}>BlueAttend</ThemedText>
                    <ThemedText style={styles.subtitle}>Smart Bluetooth Attendance System</ThemedText>
                </View>

                <View style={styles.card}>
                    <ThemedText type="defaultSemiBold" style={styles.label}>Select Your Role</ThemedText>
                    <View style={styles.roleContainer}>
                        <TouchableOpacity
                            style={[styles.roleButton, role === 'student' && styles.activeRole]}
                            onPress={() => setRole('student')}>
                            <ThemedText style={[styles.roleText, role === 'student' && styles.activeRoleText]}>Student</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.roleButton, role === 'teacher' && styles.activeRole]}
                            onPress={() => setRole('teacher')}>
                            <ThemedText style={[styles.roleText, role === 'teacher' && styles.activeRoleText]}>Teacher</ThemedText>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputWrapper}>
                            <ThemedText style={styles.inputLabel}>Username</ThemedText>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter username"
                                placeholderTextColor="#999"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            <ThemedText style={styles.inputLabel}>Password</ThemedText>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter password"
                                placeholderTextColor="#999"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <ThemedText style={styles.loginButtonText}>Sign In</ThemedText>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.footer}>
                    <ThemedText style={styles.hintText}>Teacher: admin / admin123</ThemedText>
                    <ThemedText style={styles.hintText}>Student: student / student123</ThemedText>
                </View>
            </ThemedView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 42,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748B',
        marginTop: 8,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
    },
    label: {
        fontSize: 18,
        marginBottom: 16,
        textAlign: 'center',
        color: '#334155',
    },
    roleContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    roleButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    activeRole: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
    },
    roleText: {
        fontWeight: '600',
        fontSize: 15,
        color: '#64748B',
    },
    activeRoleText: {
        color: '#FFFFFF',
    },
    form: {
        gap: 20,
    },
    inputWrapper: {
        gap: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        fontSize: 16,
        color: '#1E293B',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    loginButton: {
        backgroundColor: '#0F172A',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
    },
    footer: {
        marginTop: 32,
        alignItems: 'center',
        gap: 4,
    },
    hintText: {
        fontSize: 13,
        color: '#94A3B8',
        fontStyle: 'italic',
    },
});
