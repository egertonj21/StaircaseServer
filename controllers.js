import { broadcast, connection } from "./server.js";

export const getSensors = async (ws) => {
    try {
        const [rows] = await connection.execute("SELECT sensor_ID, sensor_name FROM sensor");
        ws.send(JSON.stringify({ action: 'getSensors', data: rows }));
    } catch (error) {
        console.error(error);
        ws.send(JSON.stringify({ action: 'getSensors', error: "Failed to fetch sensors" }));
    }
};

export const logSensorData = async (ws, payload) => {
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

export const updateSensorStatus = async (ws, payload) => {
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

export const fetchSensorRanges = async (ws) => {
    try {
        const [rows] = await connection.execute("SELECT range_ID, lower_limit, upper_limit FROM sensor_range");
        ws.send(JSON.stringify({ action: 'fetchSensorRanges', data: rows }));
    } catch (error) {
        console.error("Failed to fetch sensor ranges:", error);
        ws.send(JSON.stringify({ action: 'fetchSensorRanges', error: "Failed to fetch sensor ranges" }));
    }
};

export const fetchLightDuration = async (ws) => {
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

export const updateLedStripStatus = async (ws, payload) => {
    const { led_strip_name, active, alive, colour_id } = payload;

    console.log(`Received payload: led_strip_name=${led_strip_name}, active=${active}, alive=${alive}, colour_id=${colour_id}`);

    // Validate the input data
    if (led_strip_name === undefined || active === undefined || alive === undefined) {
        console.error("Invalid input data: led_strip_name, active, or alive is undefined");
        ws.send(JSON.stringify({ action: 'updateLedStripStatus', error: "Invalid input data: led_strip_name, active, or alive is undefined" }));
        return;
    }

    try {
        const [rows] = await connection.execute("SELECT 1 FROM LED_strip WHERE LED_strip_name = ?", [led_strip_name]);
        if (rows.length === 0) {
            let resolved_colour_id = colour_id;
            if (resolved_colour_id === undefined || resolved_colour_id === null) {
                const [colourRows] = await connection.execute("SELECT colour_ID FROM colour LIMIT 1");
                if (colourRows.length === 0) {
                    ws.send(JSON.stringify({ action: 'updateLedStripStatus', error: "No default colour_ID found" }));
                    return;
                }
                resolved_colour_id = colourRows[0].colour_ID;
            }
            await connection.execute("INSERT INTO LED_strip (LED_strip_name, LED_alive, LED_active, colour_ID) VALUES (?, ?, ?, ?)", [led_strip_name, alive || 0, active || 0, resolved_colour_id]);
            ws.send(JSON.stringify({ action: 'updateLedStripStatus', message: "LED strip status inserted successfully" }));
        } else {
            if (active !== undefined) {
                await connection.execute("UPDATE LED_strip SET LED_active = ? WHERE LED_strip_name = ?", [active, led_strip_name]);
            }
            if (alive !== undefined) {
                await connection.execute("UPDATE LED_strip SET LED_alive = ? WHERE LED_strip_name = ?", [alive, led_strip_name]);
            }
            if (colour_id !== undefined && colour_id !== null) {
                await connection.execute("UPDATE LED_strip SET colour_ID = ? WHERE LED_strip_name = ?", [colour_id, led_strip_name]);
            }
            ws.send(JSON.stringify({ action: 'updateLedStripStatus', message: "LED strip status updated successfully" }));
        }
    } catch (error) {
        console.error("Failed to update LED strip status:", error);
        ws.send(JSON.stringify({ action: 'updateLedStripStatus', error: "Failed to update LED strip status" }));
    }
};

export const fetchLedStripId = async (ws, payload) => {
    const { led_strip_name } = payload;
    try {
        const [rows] = await connection.execute("SELECT LED_strip_ID FROM LED_strip WHERE LED_strip_name = ?", [led_strip_name]);
        if (rows.length > 0) {
            ws.send(JSON.stringify({ action: 'fetchLedStripId', data: { led_strip_id: rows[0].LED_strip_ID } }));
        } else {
            ws.send(JSON.stringify({ action: 'fetchLedStripId', error: "LED strip not found" }));
        }
    } catch (error) {
        console.error("Failed to fetch LED strip ID:", error);
        ws.send(JSON.stringify({ action: 'fetchLedStripId', error: "Failed to fetch LED strip ID" }));
    }
};

export const fetchColourRgb = async (ws, payload) => {
    const { led_strip_id, range_id } = payload;
    try {
        const [rows] = await connection.execute(
            `SELECT c.red, c.green, c.blue
             FROM sensor_light sl
             INNER JOIN LED_strip ls ON sl.LED_strip_ID = ls.LED_strip_ID
             INNER JOIN colour c ON sl.colour_ID = c.colour_ID
             WHERE sl.LED_strip_ID = ? AND sl.range_ID = ?`,
            [led_strip_id, range_id]
        );
        if (rows.length > 0) {
            ws.send(JSON.stringify({ action: 'fetchColourRgb', data: { colour_rgb: rows[0] } }));
        } else {
            ws.send(JSON.stringify({ action: 'fetchColourRgb', error: "Colour not found" }));
        }
    } catch (error) {
        console.error("Failed to fetch colour RGB:", error);
        ws.send(JSON.stringify({ action: 'fetchColourRgb', error: "Failed to fetch colour RGB" }));
    }
};
