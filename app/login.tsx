import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
    const [userId, setUserId] = useState('');
    const [role, setRole] = useState<'teacher' | 'student'>('student');
    const { login } = useAuth();
    const router = useRouter();

    const handleLogin = async () => {
        if (!userId.trim()) {
            alert('Please enter a User ID or Name');
            return;
        }
        await login(userId, role);
        router.replace('/(tabs)');
    };

    return (
        <ThemedView style={styles.container}>
            <View style={styles.logoContainer}>
                <ThemedText type="title">BT Attendance</ThemedText>
                <ThemedText type="subtitle">Login to continue</ThemedText>
            </View>

            <View style={styles.inputContainer}>
                <ThemedText type="defaultSemiBold">User ID / Name</ThemedText>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. Student 1 or Teacher John"
                    placeholderTextColor="#888"
                    value={userId}
                    onChangeText={setUserId}
                />
            </View>

            <ThemedText type="defaultSemiBold">Select Role</ThemedText>
            <View style={styles.roleContainer}>
                <TouchableOpacity
                    style={[styles.roleButton, role === 'student' && styles.activeRole]}
                    onPress={() => setRole('student')}>
                    <ThemedText style={[styles.roleText, role === 'student' && styles.activeText]}>Student</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.roleButton, role === 'teacher' && styles.activeRole]}
                    onPress={() => setRole('teacher')}>
                    <ThemedText style={[styles.roleText, role === 'teacher' && styles.activeText]}>Teacher</ThemedText>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                <ThemedText style={styles.loginButtonText}>Login</ThemedText>
            </TouchableOpacity>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        gap: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    inputContainer: {
        gap: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 15,
        borderRadius: 10,
        color: '#000',
        backgroundColor: '#fff',
    },
    roleContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    roleButton: {
        flex: 1,
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        alignItems: 'center',
    },
    activeRole: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    roleText: {
        fontWeight: 'bold',
    },
    activeText: {
        color: '#fff',
    },
    loginButton: {
        backgroundColor: '#007AFF',
        padding: 18,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
    },
    loginButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
