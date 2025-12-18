<script>
import { ref, onMounted, onUnmounted } from "vue";
import { MQTTService } from "../Services/MQTT";

export function useAsap() {
  const asap = ref(0);
  let mqtt;

  onMounted(() => {
    mqtt = new MQTTService(
      "ws://broker.hivemq.com:8000/mqtt",
      {
        onConnect: () => {
          mqtt.subscribe("sensor/asap");
        },
        onMessage: (topic, message) => {
          if (topic === "sensor/asap") {
            const v = parseFloat(message.toString());
            if (!isNaN(v)) {
              asap.value = v;
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
    asap
  };
}
</script>