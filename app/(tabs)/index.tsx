import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Device } from 'react-native-ble-plx';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { bluetoothService } from '@/services/bluetooth';
import { peripheralService } from '@/services/peripheral';

export default function HomeScreen() {
  const { role, userId, logout } = useAuth();
  const [isBusy, setIsBusy] = useState(false);
  const [presentStudents, setPresentStudents] = useState<string[]>([]);
  const [discoveredDevices, setDiscoveredDevices] = useState<Device[]>([]);

  // Teacher Scan Handler
  const handleTeacherScan = async () => {
    const hasPermission = await bluetoothService.requestPermissions();
    if (!hasPermission) {
      alert('Bluetooth permissions denied');
      return;
    }

    if (isBusy) {
      bluetoothService.stopScanning();
      setIsBusy(false);
    } else {
      setDiscoveredDevices([]);
      setPresentStudents([]); // Clear previous list
      setIsBusy(true);
      bluetoothService.startScanning((device) => {
        if (device.name) {
          setPresentStudents((prev) => {
            if (prev.includes(device.name!)) return prev;
            return [...prev, device.name!];
          });
          setDiscoveredDevices((prev) => {
            if (prev.find((d) => d.id === device.id)) return prev;
            return [...prev, device];
          });
        }
      });
      setTimeout(() => setIsBusy(false), 15000);
    }
  };

  // Student Advertise Handler
  const handleStudentPresence = async () => {
    if (isBusy) {
      await peripheralService.stopAdvertising();
      setIsBusy(false);
    } else {
      setIsBusy(true);
      await peripheralService.startAdvertising(userId || 'Anonymous Student');
      alert('Broadcasting presence for 1 minute...');
      setTimeout(async () => {
        await peripheralService.stopAdvertising();
        setIsBusy(false);
      }, 60000);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.header}>
        <View>
          <ThemedText type="title">Hello, {userId}!</ThemedText>
          <ThemedText type="subtitle">Mode: {role === 'teacher' ? 'Instructor' : 'Student'}</ThemedText>
        </View>
        <TouchableOpacity onPress={logout}>
          <ThemedText style={styles.logoutText}>Logout</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {role === 'teacher' ? (
        <>
          <ThemedView style={styles.section}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleTeacherScan}>
              <ThemedText style={styles.buttonText}>
                {isBusy ? 'Scanning...' : 'Take Attendance'}
              </ThemedText>
              {isBusy && <ActivityIndicator color="#fff" style={{ marginLeft: 10 }} />}
            </TouchableOpacity>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="subtitle">Students Present ({presentStudents.length})</ThemedText>
            {presentStudents.length === 0 && !isBusy && (
              <ThemedText style={styles.emptyText}>No students detected nearby.</ThemedText>
            )}
            {presentStudents.map((student, idx) => (
              <View key={idx} style={styles.listItem}>
                <ThemedText type="defaultSemiBold">✅ {student}</ThemedText>
              </View>
            ))}
          </ThemedView>
        </>
      ) : (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Attendance Check</ThemedText>
          <ThemedText style={styles.description}>
            Wait for your teacher to initiate the scan. Then, tap the button below to mark yourself as present.
          </ThemedText>
          <TouchableOpacity
            style={[styles.primaryButton, isBusy && styles.activeButton]}
            onPress={handleStudentPresence}
          >
            <ThemedText style={styles.buttonText}>
              {isBusy ? 'Presence Broadcasting...' : 'Mark Me Present'}
            </ThemedText>
            {isBusy && <ActivityIndicator color="#fff" style={{ marginLeft: 10 }} />}
          </TouchableOpacity>
        </ThemedView>
      )}

      <ThemedView style={styles.footer}>
        <ThemedText type="default">Secure Bluetooth Attendance v1.0</ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
  },
  section: {
    gap: 12,
    marginBottom: 24,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  activeButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listItem: {
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
    marginTop: 8,
  },
  emptyText: {
    opacity: 0.6,
    fontStyle: 'italic',
  },
  description: {
    marginBottom: 10,
    opacity: 0.8,
  },
  logoutText: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    opacity: 0.4,
  },
});
