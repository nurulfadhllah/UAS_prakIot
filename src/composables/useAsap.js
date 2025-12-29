import { ref } from "vue";

export function useAsap() {
  const asap = ref(0);

  function onMessage(topic, message) {
    if (topic === "sensor/asap") {
      asap.value = parseInt(message.toString());
    }
  }

  return { asap, onMessage };
}
