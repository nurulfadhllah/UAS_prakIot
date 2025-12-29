<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import Chart from "chart.js/auto";
import { MQTTService } from "./Services/MQTT";

import { useSuhu } from "./composables/useSuhu";
import { useKelembapan } from "./composables/useKelembapan";
import { useAsap } from "./composables/useAsap";
import { useApi } from "./composables/useApi";

/* ================= STATE ================= */
const data = ref([
  { title: "Suhu", value: 0, unit: "°C", color: "#ff7675" },
  { title: "Kelembapan", value: 0, unit: "%", color: "#74b9ff" },
  { title: "Asap", value: 0, unit: "ADC", color: "#55efc4" },
  { title: "Api", value: null, unit: "ADC", color: "#ff6b00" }
]);

/* ================= COMPOSABLE ================= */
const { suhu, onMessage: suhuMsg } = useSuhu();
const { kelembapan, onMessage: humMsg } = useKelembapan();
const { asap, onMessage: asapMsg } = useAsap();
const { api, onMessage: apiMsg } = useApi();

const apiColor = computed(() => {
  const v = data.value[3].value;
  if (v === null) return "#7f8c8d";
  if (v < 1500) return "#e74c3c";
  if (v < 2800) return "#f39c12";
  return "#2ecc71";
});

/* ================= CHART ================= */
const charts = [];

function initChart(i, color) {
  const ctx = document.getElementById(`chart-${i}`);
  if (!ctx) return;

  charts[i] = new Chart(ctx, {
    type: "line",
    data: {
      labels: Array(20).fill(""),
      datasets: [{
        data: Array(20).fill(0),
        borderColor: color,
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { beginAtZero: true }
      }
    }
  });
}

function pushChart(i, v) {
  if (!charts[i]) return;
  charts[i].data.datasets[0].data.push(v);
  charts[i].data.datasets[0].data.shift();
  charts[i].update();
}

/* ================= WATCH SENSOR ================= */
watch(suhu, v => {
  data.value[0].value = v;
  pushChart(0, v);
});

watch(kelembapan, v => {
  data.value[1].value = v;
  pushChart(1, v);
});

watch(asap, v => {
  data.value[2].value = v;
  pushChart(2, v);
});

watch(api, v => {
  data.value[3].value = v;
  pushChart(3, v);
});

/* ================= MQTT ================= */
let mqtt;

function handleMQTTMessage(topic, message) {
  suhuMsg(topic, message);
  humMsg(topic, message);
  asapMsg(topic, message);
  apiMsg(topic, message);
}

onMounted(() => {
  data.value.forEach((d, i) => initChart(i, d.color));

  mqtt = new MQTTService("wss://broker.emqx.io:8084/mqtt", {
    onConnect: () => console.log("✅ MQTT Connected"),
    onMessage: handleMQTTMessage
  });

  mqtt.connect();
});

onUnmounted(() => mqtt?.disconnect());
</script>

<template>
  <div class="dashboard">
    <div class="header">🔥 Sistem Deteksi Kebakaran</div>

    <div class="content">
      <div class="card-grid">
        <div class="card" v-for="(d,i) in data" :key="i">
          <div class="card-body">

            <div class="number">{{ d.value ?? "-" }}</div>
            <div class="unit">{{ d.title }} ({{ d.unit }})</div>

            <!-- STATUS API -->
            <div
              v-if="d.title === 'Api'"
              class="api-status"
              :style="{ color: apiColor }"
            >
              {{ apiStatus }}
            </div>

            <canvas :id="`chart-${i}`"></canvas>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">© KELOMPOK 8</div>
  </div>
</template>

<style scoped>
.dashboard {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(145deg, #eef3ff, #e3fdf5);
  font-family: "Poppins", sans-serif;
}

/* HEADER */
.header {
  height: 68px;
  background: linear-gradient(135deg, #3f51ff, #6a2cff);
  color: white;
  font-size: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(0,0,0,.25);
}

/* CONTENT */
.content {
  flex: 1;
  padding: 36px 24px;
  display: flex;
  justify-content: center;
}

/* GRID */
.card-grid {
  width: 100%;
  max-width: 1000px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 28px;
}

/* CARD */
.card {
  background: white;
  border-radius: 22px;
  padding: 20px;
  box-shadow: 0 14px 30px rgba(0,0,0,.12);
  transition: .25s;
}

.card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 38px rgba(0,0,0,.18);
}

.card-body {
  text-align: center;
}

/* VALUE */
.number {
  font-size: 36px;
  font-weight: 800;
  color: #2d3436;
}

.unit {
  font-size: 14px;
  color: #636e72;
}

/* API STATUS */
.api-status {
  font-size: 13px;
  font-weight: 700;
  margin-top: 4px;
}

.adc-raw {
  font-size: 12px;
  font-weight: 600;
  color: #555;
  margin-bottom: 6px;
}

/* CHART */
canvas {
  margin-top: 12px;
  height: 120px !important;
}

/* FOOTER */
.footer {
  height: 56px;
  background: linear-gradient(135deg, #3f51ff, #6a2cff);
  color: white;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .card-grid {
    grid-template-columns: 1fr;
  }

  .number {
    font-size: 30px;
  }

  canvas {
    height: 90px !important;
  }
}
</style>
