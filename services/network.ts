
// Network functionality removed as requested.
// This file remains as a placeholder to avoid breaking potential imports during transition.

export interface DataUpdateMessage {
    type: 'DATA_UPDATE';
    dataType: 'DOC' | 'MAINTENANCE' | 'SCHEDULE' | 'EMPLOYEE' | 'OM';
    payload: any;
}

class NetworkServiceClass {
    // Dummy methods
    public getStatus() { return false; }
    public onStatusChange(callback: (status: boolean) => void) {}
    public onDataUpdate(callback: (msg: DataUpdateMessage) => void) {}
    public onMessage(callback: (msg: any) => void) {}
    public sendMessage(msg: any) {}
    public sendDataUpdate(dataType: string, payload: any) {}
    public reloadSettings() {}
}

export const NetworkService = new NetworkServiceClass();
