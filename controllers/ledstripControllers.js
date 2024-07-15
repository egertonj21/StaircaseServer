export const updateLedStripStatus = async (ws, connection, payload) => {
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

export const fetchLedStripId = async (ws, connection, payload) => {
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

export const fetchColourRgb = async (ws, connection, payload) => {
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
