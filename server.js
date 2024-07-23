import express from "express";
import { WebSocketServer } from "ws";
import { createConnection} from "./dbconfig.js";
import cors from "cors";
import allRoutes from "./routes/allRoutes.js";


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

        // Initialize routes
        allRoutes(wss, connection);
        

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
