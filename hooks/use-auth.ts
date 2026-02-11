import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export type UserRole = 'teacher' | 'student' | null;

export function useAuth() {
    const [role, setRole] = useState<UserRole>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadUser();
    }, []);

    async function loadUser() {
        try {
            const savedRole = await AsyncStorage.getItem('userRole');
            const savedUserId = await AsyncStorage.getItem('userId');
            if (savedRole && savedUserId) {
                setRole(savedRole as UserRole);
                setUserId(savedUserId);
            }
        } catch (e) {
            console.error('Failed to load user', e);
        } finally {
            setIsLoading(false);
        }
    }

    async function login(newUserId: string, newRole: UserRole) {
        try {
            await AsyncStorage.setItem('userRole', newRole as string);
            await AsyncStorage.setItem('userId', newUserId);
            setRole(newRole);
            setUserId(newUserId);
        } catch (e) {
            console.error('Failed to login', e);
        }
    }

    async function logout() {
        try {
            await AsyncStorage.removeItem('userRole');
            await AsyncStorage.removeItem('userId');
            setRole(null);
            setUserId(null);
        } catch (e) {
            console.error('Failed to logout', e);
        }
    }

    return { role, userId, isLoading, login, logout };
}
