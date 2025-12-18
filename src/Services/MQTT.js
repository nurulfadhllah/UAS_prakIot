import mqtt from "mqtt";

export class MQTTService {
  constructor(host, messageCallbacks) {
    this.mqttClient = null;
    this.host = host;
    this.messageCallbacks = messageCallbacks;
  }

  connect() {
    this.mqttClient = mqtt.connect(this.host);

    this.mqttClient.on("error", (err) => {
      console.log(err);
      this.mqttClient.end();
      if (this.messageCallbacks?.onError) {
        this.messageCallbacks.onError(err);
      }
    });

    this.mqttClient.on("connect", () => {
      console.log("MQTT Connected");
      this.messageCallbacks?.onConnect?.("Connected");
    });

    this.mqttClient.on("message", (topic, message) => {
      this.messageCallbacks?.onMessage?.(topic, message);
    });

    this.mqttClient.on("close", () => {
      console.log("MQTT Disconnected");
      this.messageCallbacks?.onClose?.();
    });
  }

  publish(topic, message) {
    this.mqttClient.publish(topic, message);
  }

  subscribe(topic) {
    this.mqttClient.subscribe(topic);
  }
}
