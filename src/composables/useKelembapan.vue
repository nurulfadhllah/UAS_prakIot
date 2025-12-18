<script>
import { ref, onMounted, onUnmounted } from "vue";
import { MQTTService } from "../Services/MQTT";

export function useKelembapan() {
  const kelembapan = ref(0);
  let mqtt;

  onMounted(() => {
    mqtt = new MQTTService(
      "ws://broker.hivemq.com:8000/mqtt",
      {
        onConnect: () => {
          mqtt.subscribe("sensor/kelembapan");
        },
        onMessage: (topic, message) => {
          if (topic === "sensor/kelembapan") {
            const v = parseFloat(message.toString());
            if (!isNaN(v)) {
              kelembapan.value = v;
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
    kelembapan
  };
}
</script>
