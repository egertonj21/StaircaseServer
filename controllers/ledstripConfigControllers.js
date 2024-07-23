export const getRangeLimits = async (ws, connection) => {
    try {
        const [rows] = await connection.execute(
            "SELECT range_ID, upper_limit FROM sensor_range WHERE range_ID IN (1, 2)"
        );

        const closeRange = rows.find(row => row.range_ID === 1);
        const midRange = rows.find(row => row.range_ID === 2);

        if (closeRange && midRange) {
            const response = JSON.stringify({
                action: 'getRangeLimits',
                data: {
                    closeUpperLimit: closeRange.upper_limit,
                    midUpperLimit: midRange.upper_limit
                }
            });
            console.log(`Sending response for getRangeLimits: ${response}`);
            ws.send(response);
        } else {
            throw new Error("Missing range data");
        }
    } catch (error) {
        console.error(error);
        ws.send(JSON.stringify({ action: 'error', message: "Failed to fetch range limits" }));
    }
};

export const determineLEDColor = async (ws, connection, payload) => {
    const { sensorName, distance } = payload;

    if (typeof sensorName !== 'string' || typeof distance !== 'number') {
        ws.send(JSON.stringify({ action: 'error', message: "Invalid input data" }));
        return;
    }

    try {
        // Determine the range_ID based on the distance
        const [rangeRows] = await connection.execute(
            "SELECT range_ID FROM sensor_range WHERE ? BETWEEN lower_limit AND upper_limit",
            [distance]
        );

        if (rangeRows.length === 0) {
            ws.send(JSON.stringify({ action: 'error', message: "Invalid distance range" }));
            return;
        }

        const range_ID = rangeRows[0].range_ID;

        // Get the LED_strip_ID based on the sensor name
        const [ledStripRows] = await connection.execute(
            "SELECT LED_strip_ID FROM LED_strip WHERE LED_strip_name = ?",
            [sensorName]
        );

        if (ledStripRows.length === 0) {
            ws.send(JSON.stringify({ action: 'error', message: "Invalid sensor name" }));
            return;
        }

        const LED_strip_ID = ledStripRows[0].LED_strip_ID;

        // Get the colour_ID from the sensor_light table
        const [sensorLightRows] = await connection.execute(
            "SELECT colour_ID FROM sensor_light WHERE LED_strip_ID = ? AND range_ID = ?",
            [LED_strip_ID, range_ID]
        );

        if (sensorLightRows.length === 0) {
            ws.send(JSON.stringify({ action: 'error', message: "No matching color found for the given sensor and range" }));
            return;
        }

        const colour_ID = sensorLightRows[0].colour_ID;

        // Get the RGB values from the colour table
        const [colourRows] = await connection.execute(
            "SELECT red, green, blue FROM colour WHERE colour_ID = ?",
            [colour_ID]
        );

        if (colourRows.length === 0) {
            ws.send(JSON.stringify({ action: 'error', message: "Invalid color ID" }));
            return;
        }

        const { red, green, blue } = colourRows[0];

        // Send the RGB values back via WebSocket
        const response = JSON.stringify({
            action: 'determineLEDColor',
            data: { red, green, blue }
        });

        console.log(`Sending response for determineLEDColor: ${response}`);
        ws.send(response);
    } catch (error) {
        console.error(error);
        ws.send(JSON.stringify({ action: 'error', message: "Failed to determine LED color" }));
    }
};
