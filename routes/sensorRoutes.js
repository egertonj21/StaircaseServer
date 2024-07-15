import { getSensors, logSensorData, updateSensorStatus, fetchSensorRanges, fetchLightDuration } from "../controllers/sensorControllers.js";

export default (wss, connection) => {
    wss.on('connection', (ws) => {
        console.log('New client connected');

        ws.on('message', async (message) => {
            const data = JSON.parse(message);
            const { action, payload } = data;

            switch (action) {
                case 'getSensors':
                    await getSensors(ws, connection);
                    break;
                case 'logSensorData':
                    await logSensorData(ws, connection, payload);
                    break;
                case 'updateSensorStatus':
                    await updateSensorStatus(ws, connection, payload);
                    break;
                case 'fetchSensorRanges':
                    await fetchSensorRanges(ws, connection);
                    break;
                case 'fetchLightDuration':
                    await fetchLightDuration(ws, connection);
                    break;
                default:
                    console.error('Unknown action:', action);
            }
        });

        ws.on('close', () => {
            console.log('Client disconnected');
        });
    });
};
