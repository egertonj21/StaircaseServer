// controllers/mqttControllers.js
import mqttClient from '../mqttClient.js';

const CONTROL_TOPIC = 'control/distance_sensor';
const MUTE_TOPIC = 'audio/mute';

export const sendControlMessage = async (ws, action) => {
    if (!action || (action !== 'sleep' && action !== 'wake')) {
        const error = 'Invalid action. Must be "sleep" or "wake".';
        console.error(error);
        ws.send(JSON.stringify({ action: 'control', error }));
        return;
    }

    mqttClient.publish(CONTROL_TOPIC, action, (err) => {
        if (err) {
            console.error('Failed to publish MQTT message:', err);
            ws.send(JSON.stringify({ action: 'control', error: 'Failed to send message' }));
        } else {
            ws.send(JSON.stringify({ action: 'control', message: `Sent ${action} to ${CONTROL_TOPIC}` }));
        }
    });
};

export const sendMuteMessage = async (ws) => {
    mqttClient.publish(MUTE_TOPIC, 'mute', (err) => {
        if (err) {
            console.error('Failed to publish MQTT message:', err);
            ws.send(JSON.stringify({ action: 'mute', error: 'Failed to send message' }));
        } else {
            ws.send(JSON.stringify({ action: 'mute', message: `Sent 'mute' to ${MUTE_TOPIC}` }));
        }
    });
};
