import { BleManager, Device, State } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

class BluetoothService {
  private manager: BleManager;
  private scannerTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.manager = new BleManager();
  }

  async requestPermissions() {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      return (
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED
      );
    }
    return true;
  }

  startScanning(callback: (device: Device) => void) {
    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error('Scan Error:', error);
        return;
      }
      if (device && device.name) {
        callback(device);
      }
    });

    // Auto-stop scanning after 10 seconds to save battery
    this.scannerTimeout = setTimeout(() => {
      this.stopScanning();
    }, 10000);
  }

  stopScanning() {
    this.manager.stopDeviceScan();
    if (this.scannerTimeout) {
      clearTimeout(this.scannerTimeout);
    }
  }

  async connectToDevice(device: Device) {
    try {
      const connectedDevice = await this.manager.connectToDevice(device.id);
      await connectedDevice.discoverAllServicesAndCharacteristics();
      return connectedDevice;
    } catch (error) {
      console.error('Connection Error:', error);
      throw error;
    }
  }

  getManager() {
    return this.manager;
  }
}

export const bluetoothService = new BluetoothService();
