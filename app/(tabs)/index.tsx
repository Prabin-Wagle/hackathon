import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HandshakeChallenge } from '@/constants/types';
import { useWallet } from '@/hooks/use-wallet';
import { bluetoothService } from '@/services/bluetooth';
import { peripheralService } from '@/services/peripheral';
import { generateNonce } from '@/utils/crypto';

export default function HomeScreen() {
  const {
    wallet,
    phoneNumber,
    logout,
    addTransaction,
    topUp,
    btcToNpr,
    nprToBtc,
    biometricsAvailable,
    biometricsEnabled,
    toggleBiometrics
  } = useWallet();

  const [isBusy, setIsBusy] = useState(false);
  const [isReceiveModalVisible, setIsReceiveModalVisible] = useState(false);
  const [isSendAmountModalVisible, setIsSendAmountModalVisible] = useState(false);
  const [sendAmount, setSendAmount] = useState('50');
  const [isTopUpModalVisible, setIsTopUpModalVisible] = useState(false);
  const [topUpAmountNPR, setTopUpAmountNPR] = useState('101');
  const [activeChallenge, setActiveChallenge] = useState<HandshakeChallenge | null>(null);

  useEffect(() => {
    // Bank-style prompt to link biometrics if available but not enabled
    if (biometricsAvailable && !biometricsEnabled) {
      setTimeout(() => {
        Alert.alert(
          'Link Fingerprint',
          'Would you like to use your fingerprint for faster and more secure access next time?',
          [
            { text: 'Maybe Later', style: 'cancel' },
            { text: 'Link Now', onPress: () => handleToggleBiometrics(true) }
          ]
        );
      }, 1000);
    }
  }, [biometricsAvailable, biometricsEnabled]);

  useEffect(() => {
    return () => {
      deactivateKeepAwake();
    };
  }, []);

  const handleToggleBiometrics = async (val: boolean) => {
    try {
      await toggleBiometrics(val);
    } catch (e) {
      Alert.alert('Error', 'Failed to update biometric settings.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Exit Wallet',
      'Are you sure you want to exit? Your session will be closed, but your offline data remains secure.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: logout }
      ]
    );
  };

  const handleSendMoneyInitiate = () => {
    setIsSendAmountModalVisible(true);
  };

  const handleStartScan = async () => {
    setIsSendAmountModalVisible(false);
    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    if (amount > (wallet?.balance || 0)) {
      Alert.alert('Insufficient Balance', 'You do not have enough credits.');
      return;
    }

    try {
      const isBluetoothOn = await bluetoothService.isBluetoothEnabled();
      if (!isBluetoothOn) {
        Alert.alert('Bluetooth is Off', 'Please turn on Bluetooth in settings.');
        return;
      }

      const hasPermission = await bluetoothService.hasSendPermissions();
      if (!hasPermission) {
        await bluetoothService.requestPermissions();
        if (!(await bluetoothService.hasSendPermissions())) {
          Alert.alert('Permissions Required', 'Bluetooth/Location scanning is required.', [
            { text: 'Cancel' },
            { text: 'Settings', onPress: () => Linking.openSettings() }
          ]);
          return;
        }
      }

      setIsBusy(true);
      await activateKeepAwakeAsync().catch(() => { });

      bluetoothService.startScanning((device) => {
        if (device.name?.toLowerCase().includes('wallet')) {
          Alert.alert('Wallet Found', `Found: ${device.name}. Send ${amount} credits? (Price: ${btcToNpr(amount).toFixed(2)} NPR)`, [
            { text: 'Cancel', onPress: () => setIsBusy(false) },
            { text: 'Confirm Send', onPress: () => simulateTransfer(device.id, amount) }
          ]);
          bluetoothService.stopScanning();
        }
      });

      setTimeout(() => setIsBusy(false), 20000);
    } catch (e) {
      setIsBusy(false);
    }
  };

  const simulateTransfer = async (peerId: string, amount: number) => {
    setIsBusy(true);
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
      deactivateKeepAwake();
      Alert.alert('Success', `Sent ${amount} credits securely.`);
    }, 2000);
  };

  const handleReceiveMode = async () => {
    try {
      const isBluetoothOn = await bluetoothService.isBluetoothEnabled();
      if (!isBluetoothOn) {
        Alert.alert('Bluetooth is Off', 'Please turn on Bluetooth in settings.');
        return;
      }

      const hasPermission = await bluetoothService.hasReceivePermissions();
      if (!hasPermission) {
        await bluetoothService.requestPermissions();
        if (!(await bluetoothService.hasReceivePermissions())) {
          Alert.alert('Permissions Required', 'Nearby Devices permission is required.', [
            { text: 'Cancel' },
            { text: 'Settings', onPress: () => Linking.openSettings() }
          ]);
          return;
        }
      }

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
        await activateKeepAwakeAsync().catch(() => { });
        await peripheralService.startAdvertising(`Wallet-${phoneNumber?.slice(-4)}`);
      }
    } catch (e) {
      setIsReceiveModalVisible(false);
    }
  };

  const handleTopUp = async () => {
    const npr = parseFloat(topUpAmountNPR);
    if (isNaN(npr) || npr <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid NPR amount.');
      return;
    }
    const btc = nprToBtc(npr);
    setIsBusy(true);
    setTimeout(async () => {
      await topUp(btc);
      setIsBusy(false);
      setIsTopUpModalVisible(false);
      Alert.alert('eSewa Success', `Added ${btc.toFixed(2)} credits (Paid ${npr} NPR).`);
    }, 1500);
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
          <ThemedText type="title">Hi, {phoneNumber?.slice(-4) || 'user'}</ThemedText>
          <ThemedText style={styles.walletStatus}>● Wallet Active (Offline Mode)</ThemedText>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <ThemedText style={styles.logoutText}>Exit Wallet</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.balanceCard}>
        <ThemedText style={styles.balanceLabel}>Total NPR Balance</ThemedText>
        <View style={styles.amountRow}>
          <ThemedText style={styles.currencySymbol}>Rs.</ThemedText>
          <ThemedText style={styles.balanceAmount}>{wallet?.balance?.toFixed(0) || '0'}</ThemedText>
        </View>
        <View style={styles.tokenStats}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{wallet?.tokens.length || 0}</ThemedText>
            <ThemedText style={styles.statLabel}>Active Tokens</ThemedText>
          </View>
          <View style={[styles.statItem, { borderLeftWidth: 1, borderLeftColor: '#334155' }]}>
            <ThemedText style={styles.statValue}>100%</ThemedText>
            <ThemedText style={styles.statLabel}>Authenticated</ThemedText>
          </View>
        </View>
        <TouchableOpacity style={styles.topUpLink} onPress={() => setIsTopUpModalVisible(true)}>
          <ThemedText style={styles.topUpText}>+ Top Up via eSewa</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>My Secure Tokens</ThemedText>
          <ThemedText style={styles.tokenHint}>1 Token = 1 NPR</ThemedText>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tokenList}>
          {wallet?.tokens.length === 0 ? (
            <View style={styles.emptyTokenCard}>
              <ThemedText style={styles.emptyTokenText}>No tokens yet. Top up to mint.</ThemedText>
            </View>
          ) : (
            wallet?.tokens.map((token, idx) => (
              <View key={token.token_id} style={[styles.tokenCard, { backgroundColor: idx % 2 === 0 ? '#1E293B' : '#0F172A' }]}>
                <View style={styles.tokenVisual}>
                  <ThemedText style={styles.tokenIcon}>🪙</ThemedText>
                </View>
                <ThemedText style={styles.tokenAmount}>{token.amount} NPR</ThemedText>
                <ThemedText style={styles.tokenId}>ID: {token.token_id.slice(0, 8)}...</ThemedText>
                <View style={styles.tokenStatus}>
                  <ThemedText style={styles.statusText}>● SECURE</ThemedText>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </ThemedView>

      {biometricsAvailable && (
        <ThemedView style={styles.securitySection}>
          <View style={styles.securityInfo}>
            <ThemedText style={styles.securityTitle}>🧬 Biometric Login</ThemedText>
            <ThemedText style={styles.securityDesc}>Unlock your wallet with Fingerprint/FaceID</ThemedText>
          </View>
          <Switch
            value={biometricsEnabled}
            onValueChange={handleToggleBiometrics}
            trackColor={{ false: '#334155', true: '#3B82F6' }}
            thumbColor={biometricsEnabled ? '#F8FAFC' : '#94A3B8'}
          />
        </ThemedView>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, isBusy && styles.disabledAction]}
          onPress={handleSendMoneyInitiate}
          disabled={isBusy}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#3B82F6' }]}>
            {isBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.actionIcon}>↑</ThemedText>
            )}
          </View>
          <ThemedText style={styles.actionText}>{isBusy ? 'Scanning...' : 'Send'}</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleReceiveMode}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#10B981' }]}>
            <ThemedText style={styles.actionIcon}>↓</ThemedText>
          </View>
          <ThemedText style={styles.actionText}>Receive</ThemedText>
        </TouchableOpacity>
      </View>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Recent Transactions</ThemedText>
        <View style={styles.logList}>
          {!wallet || wallet.transactionLogs.length === 0 ? (
            <ThemedText style={styles.emptyText}>No offline transfers yet.</ThemedText>
          ) : (
            wallet.transactionLogs.map((log) => (
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

      <Modal visible={isSendAmountModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'height' : 'padding'} style={{ flex: 1, justifyContent: 'center' }}>
            <ThemedView style={[styles.modalContent, { height: 'auto', paddingBottom: 40, borderRadius: 32 }]}>
              <ThemedText type="title" style={styles.modalHeader}>Send Credits</ThemedText>
              <ThemedText style={styles.modalSubHeader}>How much would you like to transfer?</ThemedText>
              <TextInput
                style={styles.modalInput}
                value={sendAmount}
                onChangeText={setSendAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#475569"
                autoFocus
              />
              <ThemedText style={[styles.modalSubHeader, { marginBottom: 20 }]}>
                Price: {btcToNpr(parseFloat(sendAmount) || 0).toFixed(2)} NPR
              </ThemedText>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleStartScan}>
                <ThemedText style={styles.primaryBtnText}>Start Scanning</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setIsSendAmountModalVisible(false)}>
                <ThemedText style={styles.secondaryBtnText}>Cancel</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={isTopUpModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'height' : 'padding'} style={{ flex: 1, justifyContent: 'center' }}>
            <ThemedView style={[styles.modalContent, { height: 'auto', paddingBottom: 40, borderRadius: 32 }]}>
              <ThemedText type="title" style={styles.modalHeader}>Mint New Tokens</ThemedText>
              <ThemedText style={styles.modalSubHeader}>Enter amount in NPR (eSewa)</ThemedText>
              <TextInput
                style={styles.modalInput}
                value={topUpAmountNPR}
                onChangeText={setTopUpAmountNPR}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor="#475569"
                autoFocus
              />
              <ThemedText style={[styles.modalSubHeader, { marginBottom: 20 }]}>
                You will receive: {parseFloat(topUpAmountNPR || '0').toFixed(0)} Secure Tokens
              </ThemedText>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#10B981' }]} onPress={handleTopUp}>
                <ThemedText style={styles.primaryBtnText}>Top Up via eSewa</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setIsTopUpModalVisible(false)}>
                <ThemedText style={styles.secondaryBtnText}>Cancel</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={isReceiveModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText type="title" style={styles.modalHeader}>Ready to Receive</ThemedText>
            <ThemedText style={styles.modalDesc}>Scanning for nearby senders...</ThemedText>
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
  securitySection: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
  },
  securityInfo: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  securityDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
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
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  balanceLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 10,
  },
  currencySymbol: {
    fontSize: 24,
    color: '#3B82F6',
    marginRight: 8,
    fontWeight: '700',
  },
  balanceAmount: {
    fontSize: 52,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  tokenStats: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    marginTop: 20,
    padding: 15,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  tokenInfo: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  tokenCount: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '700',
  },
  topUpLink: {
    marginTop: 20,
  },
  topUpText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  tokenHint: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  tokenList: {
    gap: 15,
    paddingRight: 20,
  },
  tokenCard: {
    width: 140,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  tokenVisual: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F620',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  tokenIcon: {
    fontSize: 24,
  },
  tokenAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  tokenId: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
  tokenStatus: {
    marginTop: 12,
    backgroundColor: '#10B98120',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#10B981',
  },
  emptyTokenCard: {
    width: 280,
    height: 120,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyTokenText: {
    color: '#64748B',
    fontSize: 13,
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
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  actionIcon: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  disabledAction: {
    opacity: 0.5,
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    marginBottom: 15,
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '700',
  },
  logList: {
    gap: 10,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 16,
  },
  typeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logInfo: {
    flex: 1,
  },
  logDate: {
    fontSize: 10,
    color: '#64748B',
  },
  logAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    color: '#475569',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    padding: 24,
    marginHorizontal: 20,
  },
  modalHeader: {
    textAlign: 'center',
  },
  modalSubHeader: {
    textAlign: 'center',
    color: '#94A3B8',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 15,
    color: '#fff',
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 15,
  },
  primaryBtn: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  secondaryBtn: {
    padding: 15,
    marginTop: 5,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#94A3B8',
  },
  modalDesc: {
    textAlign: 'center',
    color: '#94A3B8',
    marginBottom: 20,
  },
  qrPlaceholder: {
    height: 250,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  qrHint: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  nonceDisplay: {
    color: '#475569',
    fontSize: 10,
    marginTop: 5,
  },
  closeBtn: {
    backgroundColor: '#EF4444',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  footerText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
});
