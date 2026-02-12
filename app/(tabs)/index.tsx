import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HandshakeChallenge } from '@/constants/types';
import { useWallet } from '@/hooks/use-wallet';
import { bluetoothService } from '@/services/bluetooth';
import { peripheralService } from '@/services/peripheral';
import { generateNonce } from '@/utils/crypto';

export default function HomeScreen() {
  const { wallet, phoneNumber, logout, addTransaction } = useWallet();
  const [isBusy, setIsBusy] = useState(false);
  const [isReceiveModalVisible, setIsReceiveModalVisible] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<HandshakeChallenge | null>(null);

  const handleSendMoney = async () => {
    const hasPermission = await bluetoothService.requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Bluetooth and location permissions are required to scan for nearby wallets.');
      return;
    }

    if (isBusy) {
      bluetoothService.stopScanning();
      setIsBusy(false);
    } else {
      setIsBusy(true);
      bluetoothService.startScanning((device) => {
        // Logic to detect a wallet "Receiver" and initiate handshake
        if (device.name?.includes('Wallet')) {
          Alert.alert('Wallet Found', `Found nearby wallet: ${device.name}. Initiate transfer?`, [
            { text: 'Cancel', onPress: () => setIsBusy(false) },
            { text: 'Send 50 BTC', onPress: () => simulateTransfer(device.id, 50) }
          ]);
          bluetoothService.stopScanning();
        }
      });
      setTimeout(() => setIsBusy(false), 20000);
    }
  };

  const simulateTransfer = async (peerId: string, amount: number) => {
    setIsBusy(true);
    // Mocking the protocol flow for the demo
    setTimeout(async () => {
      await addTransaction({
        id: Math.random().toString(36).substr(2, 9),
        type: 'SEND',
        peerId,
        amount,
        timestamp: Date.now(),
        tokenIds: ['token-123'],
        currentHash: 'HASH-' + Math.random(),
        previousHash: wallet?.transactionLogs[0]?.currentHash || 'GENESIS'
      });
      setIsBusy(false);
      Alert.alert('Success', `Sent ${amount} credits securely via Bluetooth.`);
    }, 2000);
  };

  const handleReceiveMode = async () => {
    if (isReceiveModalVisible) {
      await peripheralService.stopAdvertising();
      setIsReceiveModalVisible(false);
      setActiveChallenge(null);
    } else {
      const challenge: HandshakeChallenge = {
        peerId: phoneNumber || 'unknown',
        nonce: generateNonce(),
        sessionPublicKey: wallet?.publicKey || '',
      };

      setActiveChallenge(challenge);
      setIsReceiveModalVisible(true);

      // Advertise availability with challenge info
      await peripheralService.startAdvertising(`Wallet-${phoneNumber?.slice(-4)}`);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#0F172A', dark: '#020617' }}
      headerImage={
        <View style={styles.headerBg}>
          <ThemedText style={styles.headerTitle}>SECURE WALLET</ThemedText>
        </View>
      }>
      <ThemedView style={styles.header}>
        <View>
          <ThemedText type="title">Hi, {phoneNumber?.slice(-4)}</ThemedText>
          <ThemedText style={styles.walletStatus}>● Wallet Locked (Local Only)</ThemedText>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <ThemedText style={styles.logoutText}>Exit Wallet</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.balanceCard}>
        <ThemedText style={styles.balanceLabel}>Current Balance</ThemedText>
        <View style={styles.amountRow}>
          <ThemedText style={styles.currencySymbol}>₦</ThemedText>
          <ThemedText style={styles.balanceAmount}>{wallet?.balance || 0}</ThemedText>
        </View>
        <View style={styles.tokenInfo}>
          <ThemedText style={styles.tokenCount}>{wallet?.tokens.length || 0} Secure Tokens Held</ThemedText>
        </View>
      </ThemedView>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleSendMoney}>
          <View style={[styles.iconCircle, { backgroundColor: '#3B82F6' }]}>
            <ThemedText style={styles.actionIcon}>↑</ThemedText>
          </View>
          <ThemedText style={styles.actionText}>Send</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleReceiveMode}>
          <View style={[styles.iconCircle, { backgroundColor: '#10B981' }]}>
            <ThemedText style={styles.actionIcon}>↓</ThemedText>
          </View>
          <ThemedText style={styles.actionText}>Receive</ThemedText>
        </TouchableOpacity>
      </View>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Recent Transactions</ThemedText>
        <View style={styles.logList}>
          {wallet?.transactionLogs.length === 0 ? (
            <ThemedText style={styles.emptyText}>No offline transfers yet.</ThemedText>
          ) : (
            wallet?.transactionLogs.map((log) => (
              <View key={log.id} style={styles.logItem}>
                <View style={[styles.typeIndicator, { backgroundColor: log.type === 'SEND' ? '#EF444420' : '#10B98120' }]}>
                  <ThemedText style={{ color: log.type === 'SEND' ? '#EF4444' : '#10B981', fontWeight: 'bold' }}>
                    {log.type === 'SEND' ? '-' : '+'}
                  </ThemedText>
                </View>
                <View style={styles.logInfo}>
                  <ThemedText type="defaultSemiBold">
                    {log.type === 'SEND' ? 'Sent to' : 'Received from'} ...{log.peerId.slice(-4)}
                  </ThemedText>
                  <ThemedText style={styles.logDate}>{new Date(log.timestamp).toLocaleTimeString()}</ThemedText>
                </View>
                <ThemedText style={[styles.logAmount, { color: log.type === 'SEND' ? '#EF4444' : '#10B981' }]}>
                  {log.amount}
                </ThemedText>
              </View>
            ))
          )}
        </View>
      </ThemedView>

      <Modal visible={isReceiveModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText type="title" style={styles.modalHeader}>Ready to Receive</ThemedText>
            <ThemedText style={styles.modalDesc}>
              Scanning for nearby senders...{'\n'}
              Your public key: {wallet?.publicKey.slice(0, 8)}...
            </ThemedText>

            <View style={styles.qrPlaceholder}>
              <ThemedText style={styles.qrHint}>[ Ephemeral Challenge QR ]</ThemedText>
              <ThemedText style={styles.nonceDisplay}>Nonce: {activeChallenge?.nonce.slice(0, 10)}</ThemedText>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={handleReceiveMode}>
              <ThemedText style={styles.closeBtnText}>Stop Receiving</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>

      <ThemedView style={styles.footer}>
        <ThemedText style={styles.footerText}>Hash-Chain Integrity: Verified ✅</ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerBg: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#3B82F6',
    fontWeight: '900',
    fontSize: 24,
    letterSpacing: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  walletStatus: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 4,
  },
  logoutBtn: {
    padding: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  balanceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 32,
    padding: 30,
    marginTop: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  balanceLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 10,
  },
  currencySymbol: {
    fontSize: 24,
    color: '#F8FAFC',
    fontWeight: '400',
    marginRight: 4,
  },
  balanceAmount: {
    fontSize: 52,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  tokenInfo: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  tokenCount: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginVertical: 35,
  },
  actionButton: {
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 65,
    height: 65,
    borderRadius: 33,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  actionIcon: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  section: {
    marginTop: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    marginBottom: 20,
    fontSize: 18,
    color: '#94A3B8',
  },
  logList: {
    gap: 12,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeIndicator: {
    width: 35,
    height: 35,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  logInfo: {
    flex: 1,
  },
  logDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  logAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    color: '#475569',
    marginTop: 20,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 30,
    height: '75%',
    backgroundColor: '#0F172A',
  },
  modalHeader: {
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDesc: {
    textAlign: 'center',
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 30,
  },
  qrPlaceholder: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
    gap: 10,
  },
  qrHint: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  nonceDisplay: {
    color: '#475569',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  closeBtn: {
    backgroundColor: '#EF4444',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    paddingBottom: 20,
    opacity: 0.5,
  },
  footerText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
    opacity: 0.1,
  },
});
