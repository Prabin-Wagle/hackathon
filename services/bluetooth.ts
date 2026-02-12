import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, Device, State } from 'react-native-ble-plx';

class BluetoothService {
  private manager: BleManager;
  private scannerTimeout: any = null;

  constructor() {
    this.manager = new BleManager();
  }

  async requestPermissions() {
    if (Platform.OS === 'android') {
      try {
        const permissions: any[] = [];

        if (Platform.Version >= 31) {
          permissions.push(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
        } else {
          permissions.push(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
          );
        }

        const granted = await PermissionsAndroid.requestMultiple(permissions);
        console.log('Permission status trace:', granted);
        return granted;
      } catch (err) {
        console.error('Permission request error:', err);
        return {};
      }
    }
    return {};
  }

  async checkPermission(permission: any): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    return await PermissionsAndroid.check(permission);
  }

  async hasSendPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version >= 31) {
      const scan = await this.checkPermission(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
      const connect = await this.checkPermission(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
      const loc = await this.checkPermission(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      return scan && connect && loc;
    }
    return await this.checkPermission(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  }

  async hasReceivePermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version >= 31) {
      const adv = await this.checkPermission(PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE);
      const connect = await this.checkPermission(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
      const loc = await this.checkPermission(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      return adv && connect && loc;
    }
    return await this.checkPermission(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
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

  async isBluetoothEnabled(): Promise<boolean> {
    try {
      const state = await this.manager.state();
      return state === State.PoweredOn;
    } catch (error) {
      console.error('Error checking bluetooth state:', error);
      return false;
    }
  }

  getManager() {
    return this.manager;
  }
}

export const bluetoothService = new BluetoothService();
