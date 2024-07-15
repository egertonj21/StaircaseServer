import { broadcast } from "../server.js";

export const getSensors = async (ws, connection) => {
    try {
        const [rows] = await connection.execute("SELECT sensor_ID, sensor_name FROM sensor");
        ws.send(JSON.stringify({ action: 'getSensors', data: rows }));
    } catch (error) {
        console.error(error);
        ws.send(JSON.stringify({ action: 'getSensors', error: "Failed to fetch sensors" }));
    }
};

export const logSensorData = async (ws, connection, payload) => {
    const { sensor_ID, distance } = payload;

    console.log(`Received payload: sensor_ID=${sensor_ID}, distance=${distance}`);

    // Validate the sensor_ID and distance
    if (sensor_ID === undefined || distance === undefined) {
        console.error("Invalid input data: sensor_ID or distance is undefined");
        ws.send(JSON.stringify({ action: 'logSensorData', error: "Invalid input data: sensor_ID or distance is undefined" }));
        return;
    }

    try {
        await connection.execute("INSERT INTO input (sensor_ID, distance, timestamp) VALUES (?, ?, NOW())", [sensor_ID, distance]);

        const [rows] = await connection.execute(
            `SELECT i.sensor_ID, s.sensor_name, i.distance, i.timestamp 
             FROM input i 
             JOIN sensor s ON i.sensor_ID = s.sensor_ID
             ORDER BY i.timestamp DESC
             LIMIT 10`
        );
        broadcast({ action: 'logSensorData', data: rows });

        ws.send(JSON.stringify({ action: 'logSensorData', message: "Sensor data logged successfully" }));
    } catch (error) {
        console.error("Failed to log sensor data:", error);
        ws.send(JSON.stringify({ action: 'logSensorData', error: "Failed to log sensor data" }));
    }
};

export const updateSensorStatus = async (ws, connection, payload) => {
    const { sensor_id, active, awake } = payload;
    try {
        const [rows] = await connection.execute("SELECT 1 FROM alive WHERE sensor_ID = ?", [sensor_id]);
        if (rows.length === 0) {
            await connection.execute("INSERT INTO alive (sensor_ID, active, awake) VALUES (?, ?, ?)", [sensor_id, active || 0, awake || 0]);
            ws.send(JSON.stringify({ action: 'updateSensorStatus', message: "Sensor status inserted successfully" }));
        } else {
            if (active !== undefined) {
                await connection.execute("UPDATE alive SET active = ? WHERE sensor_ID = ?", [active, sensor_id]);
            }
            if (awake !== undefined) {
                await connection.execute("UPDATE alive SET awake = ? WHERE sensor_ID = ?", [awake, sensor_id]);
            }
            ws.send(JSON.stringify({ action: 'updateSensorStatus', message: "Sensor status updated successfully" }));
        }
    } catch (error) {
        console.error("Failed to update sensor status:", error);
        ws.send(JSON.stringify({ action: 'updateSensorStatus', error: "Failed to update sensor status" }));
    }
};

export const fetchSensorRanges = async (ws, connection) => {
    try {
        const [rows] = await connection.execute("SELECT range_ID, lower_limit, upper_limit FROM sensor_range");
        ws.send(JSON.stringify({ action: 'fetchSensorRanges', data: rows }));
    } catch (error) {
        console.error("Failed to fetch sensor ranges:", error);
        ws.send(JSON.stringify({ action: 'fetchSensorRanges', error: "Failed to fetch sensor ranges" }));
    }
};

export const fetchLightDuration = async (ws, connection) => {
    try {
        const [rows] = await connection.execute("SELECT duration FROM light_duration WHERE light_duration_ID = 1");
        if (rows.length > 0) {
            ws.send(JSON.stringify({ action: 'fetchLightDuration', data: { duration: rows[0].duration } }));
        } else {
            ws.send(JSON.stringify({ action: 'fetchLightDuration', error: "No duration found" }));
        }
    } catch (error) {
        console.error("Failed to fetch light duration:", error);
        ws.send(JSON.stringify({ action: 'fetchLightDuration', error: "Failed to fetch light duration" }));
    }
};
