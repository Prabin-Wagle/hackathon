import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

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
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newSessionInput, setNewSessionInput] = useState('');

  // Teacher Scan Handler
  const handleTeacherScan = async () => {
    if (!sessionName) {
      setIsModalVisible(true);
      return;
    }

    const hasPermission = await bluetoothService.requestPermissions();
    if (!hasPermission) {
      alert('Bluetooth permissions denied');
      return;
    }

    if (isBusy) {
      bluetoothService.stopScanning();
      setIsBusy(false);
    } else {
      setPresentStudents([]); // Clear previous list
      setIsBusy(true);
      bluetoothService.startScanning((device) => {
        if (device.name) {
          setPresentStudents((prev) => {
            if (prev.includes(device.name!)) return prev;
            return [...prev, device.name!];
          });
        }
      });
      // Stop scanning automatically after 15s
      setTimeout(() => setIsBusy(false), 15000);
    }
  };

  const createSession = () => {
    if (!newSessionInput.trim()) {
      Alert.alert('Error', 'Please enter a session name');
      return;
    }
    setSessionName(newSessionInput);
    setIsModalVisible(false);
    setNewSessionInput('');
  };

  const endSession = () => {
    Alert.alert(
      'End Session',
      `Are you sure you want to end "${sessionName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          style: 'destructive',
          onPress: () => {
            setSessionName(null);
            setPresentStudents([]);
            setIsBusy(false);
            bluetoothService.stopScanning();
          }
        }
      ]
    );
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
      headerBackgroundColor={{ light: '#D1E8FF', dark: '#1E293B' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.header}>
        <View>
          <ThemedText type="title">Hello, {userId}!</ThemedText>
          <ThemedText type="subtitle">{role === 'teacher' ? 'Instructor Dashboard' : 'Student Portal'}</ThemedText>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <ThemedText style={styles.logoutText}>Logout</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {role === 'teacher' ? (
        <>
          <ThemedView style={styles.section}>
            {sessionName ? (
              <View style={styles.sessionActiveCard}>
                <View style={styles.sessionInfo}>
                  <ThemedText type="subtitle">Active: {sessionName}</ThemedText>
                  <TouchableOpacity onPress={endSession}>
                    <ThemedText style={styles.endSessionText}>End Session</ThemedText>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.primaryButton, isBusy && styles.busyButton]}
                  onPress={handleTeacherScan}
                >
                  <ThemedText style={styles.buttonText}>
                    {isBusy ? 'Scanning Students...' : 'Update Attendance'}
                  </ThemedText>
                  {isBusy && <ActivityIndicator color="#fff" style={{ marginLeft: 10 }} />}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.primaryButton} onPress={() => setIsModalVisible(true)}>
                <ThemedText style={styles.buttonText}>+ Create New Session</ThemedText>
              </TouchableOpacity>
            )}
          </ThemedView>

          <ThemedView style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">Students Present ({presentStudents.length})</ThemedText>
              {isBusy && <ActivityIndicator size="small" />}
            </View>

            <View style={styles.studentList}>
              {presentStudents.length === 0 && !isBusy && (
                <ThemedText style={styles.emptyText}>No students detected nearby.</ThemedText>
              )}
              {presentStudents.map((student, idx) => (
                <View key={idx} style={styles.listItem}>
                  <ThemedText type="defaultSemiBold">👤 {student}</ThemedText>
                  <ThemedText style={styles.statusBadge}>Present</ThemedText>
                </View>
              ))}
            </View>
          </ThemedView>

          <Modal visible={isModalVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <ThemedText type="subtitle">New Session</ThemedText>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Math Class, Room 101"
                  value={newSessionInput}
                  onChangeText={setNewSessionInput}
                  autoFocus
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalVisible(false)}>
                    <ThemedText>Cancel</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={createSession}>
                    <ThemedText style={styles.confirmBtnText}>Start Session</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <ThemedView style={styles.section}>
          <View style={styles.studentCard}>
            <ThemedText type="subtitle">Attendance Check</ThemedText>
            <ThemedText style={styles.description}>
              Keep this screen open and tap below when your teacher starts the roll call.
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
          </View>
        </ThemedView>
      )}

      <ThemedView style={styles.footer}>
        <ThemedText type="default">BlueAttend Secure v1.1</ThemedText>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  section: {
    gap: 16,
    marginVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
    opacity: 0.8,
  },
  primaryButton: {
    backgroundColor: '#0F172A',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  busyButton: {
    backgroundColor: '#3B82F6',
  },
  activeButton: {
    backgroundColor: '#10B981',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  sessionActiveCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sessionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  endSessionText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  studentList: {
    gap: 12,
  },
  listItem: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statusBadge: {
    fontSize: 12,
    color: '#10B981',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
    fontWeight: '600',
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  description: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
  },
  logoutBtn: {
    padding: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyText: {
    opacity: 0.5,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    paddingBottom: 20,
    opacity: 0.3,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    gap: 20,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
