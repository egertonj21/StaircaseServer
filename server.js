import express from "express";
import { WebSocketServer } from "ws";
import { createConnection } from "./dbconfig.js";
import cors from "cors";
import {
    getSensors,
    logSensorData,
    updateSensorStatus,
    fetchSensorRanges,
    fetchLightDuration,
    updateLedStripStatus,
    fetchLedStripId,
    fetchColourRgb,
} from "./controllers.js";  // Assuming you have all functions in one file

const app = express();
const port = 3000;
app.use(express.json());
app.use(cors());

// Create WebSocket server
const wss = new WebSocketServer({ port: 8080 });

let connection;

const init = async () => {
    try {
        // MySQL connection setup
        connection = await createConnection();

        // Handle WebSocket connections
        wss.on('connection', (ws) => {
            console.log('New client connected');

            ws.on('message', async (message) => {
                const data = JSON.parse(message);
                const { action, payload } = data;

                switch (action) {
                    case 'getSensors':
                        await getSensors(ws);
                        break;
                    case 'logSensorData':
                        await logSensorData(ws, payload);
                        break;
                    case 'updateSensorStatus':
                        await updateSensorStatus(ws, payload);
                        break;
                    case 'fetchSensorRanges':
                        await fetchSensorRanges(ws);
                        break;
                    case 'fetchLightDuration':
                        await fetchLightDuration(ws);
                        break;
                    case 'updateLedStripStatus':
                        await updateLedStripStatus(ws, payload);
                        break;
                    case 'fetchLedStripId':
                        await fetchLedStripId(ws, payload);
                        break;
                    case 'fetchColourRgb':
                        await fetchColourRgb(ws, payload);
                        break;
                    default:
                        console.error('Unknown action:', action);
                }
            });

            ws.on('close', () => {
                console.log('Client disconnected');
            });
        });

        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });

    } catch (error) {
        console.error("Failed to initialize:", error);
    }
};

init();

const broadcast = (message) => {
    wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
};

export { broadcast, connection };
