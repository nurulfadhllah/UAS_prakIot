import mqtt from "mqtt";

export class MQTTService {
  constructor(url, options = {}) {
    this.client = mqtt.connect(url);

    this.client.on("connect", () => {
      console.log("🌐 MQTT Connected");
      this.client.subscribe("sensor/#"); // ⬅️ WAJIB
      options.onConnect && options.onConnect();
    });

    this.client.on("message", (topic, message) => {
      options.onMessage && options.onMessage(topic, message);
    });

    this.client.on("error", err => {
      console.error("MQTT Error:", err);
      options.onError && options.onError(err);
    });

    this.client.on("close", () => {
      console.warn("MQTT Closed");
      options.onClose && options.onClose();
    });
  }

  publish(topic, message) {
    this.client.publish(topic, message);
  }

  disconnect() {
    this.client.end();
  }
}
