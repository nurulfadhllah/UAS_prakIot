<script>
import { ref, onMounted, onUnmounted } from "vue";
import { MQTTService } from "../Services/MQTT";

export function useSuhu() {
  const suhu = ref(0);
  let mqtt;

  onMounted(() => {
    mqtt = new MQTTService(
      "ws://broker.hivemq.com:8000/mqtt",
      {
        onConnect: () => {
          mqtt.subscribe("sensor/suhu");
        },
        onMessage: (topic, message) => {
          if (topic === "sensor/suhu") {
            const v = parseFloat(message.toString());
            if (!isNaN(v)) {
              suhu.value = v;
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
    suhu
  };
}
</script>
