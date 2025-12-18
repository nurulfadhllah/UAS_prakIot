<script>
import { ref, onMounted, onUnmounted } from "vue";
import { MQTTService } from "../Services/MQTT";

export function useApi() {
  const api = ref(0);
  let mqtt;

  onMounted(() => {
    mqtt = new MQTTService(
      "ws://broker.hivemq.com:8000/mqtt",
      {
        onConnect: () => {
          mqtt.subscribe("sensor/api");
        },
        onMessage: (topic, message) => {
          if (topic === "sensor/api") {
            const v = parseFloat(message.toString());
            if (!isNaN(v)) {
              api.value = v;
            }
          }
        }
      }
    );
    mqtt.connect();
  });

  onUnmounted(() => {
    mqtt?.disconnect();
  });

  return {
    api
  };
}
</script>
