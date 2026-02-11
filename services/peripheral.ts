import { startAdvertising, stopAdvertising } from 'munim-bluetooth-peripheral';

class PeripheralService {
    private serviceUUID = '12345678-1234-1234-1234-1234567890ab';
    private characteristicUUID = '87654321-4321-4321-4321-ba0987654321';

    async startAdvertising(userName: string) {
        try {
            // Configure services first if needed (though startAdvertising often takes configuration)
            // Note: Library specifics might vary, but based on exports:

            await startAdvertising({
                localName: userName,
                serviceUUIDs: [this.serviceUUID],
            });
            console.log('Started peripheral advertising as:', userName);
        } catch (error) {
            console.error('Peripheral Error:', error);
        }
    }

    async stopAdvertising() {
        try {
            await stopAdvertising();
        } catch (error) {
            console.error('Stop Peripheral Error:', error);
        }
    }
}

export const peripheralService = new PeripheralService();
