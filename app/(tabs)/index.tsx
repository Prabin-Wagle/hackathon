import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Device } from 'react-native-ble-plx';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { bluetoothService } from '@/services/bluetooth';

export default function HomeScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);

  const handleScan = async () => {
    const hasPermission = await bluetoothService.requestPermissions();
    if (!hasPermission) {
      alert('Bluetooth permissions denied');
      return;
    }

    if (isScanning) {
      bluetoothService.stopScanning();
      setIsScanning(false);
    } else {
      setDevices([]);
      setIsScanning(true);
      bluetoothService.startScanning((device) => {
        setDevices((prev) => {
          if (prev.find((d) => d.id === device.id)) return prev;
          return [...prev, device];
        });
      });

      // Stop scanning automatically after 10s
      setTimeout(() => setIsScanning(false), 10000);
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
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">BT Chat & Attendance</ThemedText>
        <HelloWave />
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <TouchableOpacity style={styles.scanButton} onPress={handleScan}>
          <ThemedText style={styles.buttonText}>
            {isScanning ? 'Stop Scanning' : 'Start Scanning for Devices'}
          </ThemedText>
          {isScanning && <ActivityIndicator color="#fff" style={{ marginLeft: 10 }} />}
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Nearby Devices</ThemedText>
        {devices.length === 0 && !isScanning && (
          <ThemedText>No devices found yet.</ThemedText>
        )}
        {devices.map((device) => (
          <ThemedView key={device.id} style={styles.deviceItem}>
            <ThemedText type="defaultSemiBold">{device.name || 'Unnamed Device'}</ThemedText>
            <ThemedText type="default">{device.id}</ThemedText>
          </ThemedView>
        ))}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  scanButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deviceItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginTop: 5,
  },
});
