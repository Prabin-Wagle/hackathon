import Peripheral from 'munim-bluetooth-peripheral';

class PeripheralService {
    private serviceUUID = '12345678-1234-1234-1234-1234567890ab';
    private characteristicUUID = '87654321-4321-4321-4321-ba0987654321';

    async startAdvertising(userName: string) {
        try {
            if (typeof Peripheral.isAdvertising === 'function') {
                const isAdv = await Peripheral.isAdvertising();
                if (isAdv) await Peripheral.stopAdvertising();
            }

            await Peripheral.addService(this.serviceUUID, true);
            await Peripheral.addCharacteristicToService(
                this.serviceUUID,
                this.characteristicUUID,
                1, // Permissions: Read
                2 // Properties: Read
            );

            // Set Name for advertising
            await Peripheral.setName(userName);
            await Peripheral.startAdvertising({
                name: userName,
                serviceUUIDs: [this.serviceUUID],
            });
            console.log('Started peripheral advertising as:', userName);
        } catch (error) {
            console.error('Peripheral Error:', error);
        }
    }

    async stopAdvertising() {
        try {
            await Peripheral.stopAdvertising();
        } catch (error) {
            console.error('Stop Peripheral Error:', error);
        }
    }
}

export const peripheralService = new PeripheralService();
