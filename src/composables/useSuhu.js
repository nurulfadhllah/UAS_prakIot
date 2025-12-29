import { ref } from "vue";

export function useSuhu() {
  const suhu = ref(0);

  function onMessage(topic, message) {
    if (topic === "sensor/suhu") {
      suhu.value = parseFloat(message.toString());
    }
  }

  return { suhu, onMessage };
}
