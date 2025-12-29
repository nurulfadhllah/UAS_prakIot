import { ref } from "vue";

export function useKelembapan() {
  const kelembapan = ref(0);

  function onMessage(topic, message) {
    if (topic === "sensor/kelembapan") {
      kelembapan.value = parseFloat(message.toString());
    }
  }

  return { kelembapan, onMessage };
}
