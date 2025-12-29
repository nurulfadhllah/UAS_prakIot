import { ref } from "vue";

export function useApi() {
  const api = ref(null);

  function onMessage(topic, message) {
    if (topic !== "sensor/api") return;

    const raw = parseInt(message.toString());
    if (isNaN(raw)) return;

    api.value = raw; // SIMPAN ADC ASLI
  }

  return { api, onMessage };
}
