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

// State untuk Fuzzy Logic
const nilaiFuzzy = ref(0);
const statusSistem = ref("Menunggu Data...");

/* ================= COMPOSABLE ================= */
const { suhu, onMessage: suhuMsg } = useSuhu();
const { kelembapan, onMessage: humMsg } = useKelembapan();
const { asap, onMessage: asapMsg } = useAsap();
const { api, onMessage: apiMsg } = useApi();

// Warna indikator api individual
const apiColor = computed(() => {
  const v = data.value[3].value;
  if (v === null) return "#7f8c8d";
  if (v < 1500) return "#e74c3c"; // Dekat api (Danger)
  if (v < 2800) return "#f39c12"; // Warning
  return "#2ecc71"; // Jauh/Aman
});

// Text status untuk sensor Api (Fix variabel yg hilang sebelumnya)
const apiStatus = computed(() => {
    const v = data.value[3].value;
    if (v === null) return "-";
    if (v < 1500) return "TERDETEKSI";
    if (v < 2800) return "WASPADA";
    return "AMAN";
});

// Computed Class untuk Panel Status Utama (Berdasarkan Status Fuzzy)
const statusClass = computed(() => {
    const s = statusSistem.value.toLowerCase();
    if (s.includes("bahaya") || s.includes("kebakaran")) return "status-danger";
    if (s.includes("waspada") || s.includes("warning")) return "status-warning";
    return "status-safe";
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
      maintainAspectRatio: false,
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
watch(suhu, v => { data.value[0].value = v; pushChart(0, v); });
watch(kelembapan, v => { data.value[1].value = v; pushChart(1, v); });
watch(asap, v => { data.value[2].value = v; pushChart(2, v); });
watch(api, v => { data.value[3].value = v; pushChart(3, v); });

/* ================= MQTT ================= */
let mqtt;

function handleMQTTMessage(topic, message) {
  // Panggil handler composable standar
  suhuMsg(topic, message);
  humMsg(topic, message);
  asapMsg(topic, message);
  apiMsg(topic, message);

  // --- TAMBAHAN: Handler untuk Fuzzy & Status ---
  // Sesuaikan string di .includes() dengan topik MQTT Anda
  // Contoh topik: "kelompok8/fuzzy" atau "kelompok8/status"
  
  if (topic.includes("fuzzy")) {
      // Pastikan pesan dikonversi ke float, ambil 2 desimal
      nilaiFuzzy.value = parseFloat(message).toFixed(2);
  }

  if (topic.includes("status")) {
      statusSistem.value = message.toString();
  }
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
      <div class="main-container">
        
        <div class="status-card" :class="statusClass">
            <div class="status-icon">
                <span v-if="statusClass === 'status-danger'">🚨</span>
                <span v-else-if="statusClass === 'status-warning'">⚠️</span>
                <span v-else>✅</span>
            </div>
            <div class="status-info">
                <div class="status-label">STATUS SISTEM</div>
                <div class="status-text">{{ statusSistem }}</div>
            </div>
            <div class="fuzzy-info">
                <div class="fuzzy-label">NILAI FUZZY</div>
                <div class="fuzzy-value">{{ nilaiFuzzy }}</div>
            </div>
        </div>
        <div class="card-grid">
          <div class="card" v-for="(d,i) in data" :key="i">
            <div class="card-body">
              <div class="number">{{ d.value ?? "-" }}</div>
              <div class="unit">{{ d.title }} ({{ d.unit }})</div>

              <div
                v-if="d.title === 'Api'"
                class="api-status"
                :style="{ color: apiColor }"
              >
                {{ apiStatus }}
              </div>

              <div class="chart-container">
                  <canvas :id="`chart-${i}`"></canvas>
              </div>
            </div>
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
  z-index: 10;
}

/* CONTENT */
.content {
  flex: 1;
  padding: 36px 24px;
  display: flex;
  justify-content: center;
}

.main-container {
    width: 100%;
    max-width: 1000px;
    display: flex;
    flex-direction: column;
    gap: 28px;
}

/* ================= STATUS CARD BARU ================= */
.status-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 32px;
    border-radius: 22px;
    background: white;
    box-shadow: 0 14px 30px rgba(0,0,0,.12);
    color: white;
    transition: 0.3s;
}

.status-safe {
    background: linear-gradient(135deg, #3c7cda, #3c7cda);
    box-shadow: 0 10px 25px rgba(38, 125, 212, 0.4);
}
.status-warning {
    background: linear-gradient(135deg, #f1c40f, #f39c12);
    box-shadow: 0 10px 25px rgba(241, 196, 15, 0.4);
}
.status-danger {
    background: linear-gradient(135deg, #e74c3c, #c0392b);
    box-shadow: 0 10px 25px rgba(231, 76, 60, 0.4);
    animation: pulse 1.5s infinite;
}

.status-icon { font-size: 42px; margin-right: 20px; }
.status-info { flex: 1; text-align: left; }
.status-label { font-size: 12px; opacity: 0.9; font-weight: 600; letter-spacing: 1px; }
.status-text { font-size: 28px; font-weight: 800; text-transform: uppercase; }

.fuzzy-info { 
    text-align: right; 
    border-left: 1px solid rgba(255,255,255,0.3); 
    padding-left: 20px; 
}
.fuzzy-label { font-size: 12px; opacity: 0.9; }
.fuzzy-value { font-size: 24px; font-weight: 700; }
/* ==================================================== */

/* GRID */
.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 28px;
}

/* CARD */
.card {
  background: white;
  border-radius: 22px;
  padding: 20px;
  box-shadow: 0 14px 30px rgba(0,0,0,.08);
  transition: .25s;
}

.card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 38px rgba(0,0,0,.15);
}

.card-body { text-align: center; }

/* VALUE */
.number {
  font-size: 36px;
  font-weight: 800;
  color: #2d3436;
}

.unit { font-size: 14px; color: #636e72; }

/* API STATUS */
.api-status {
  font-size: 13px;
  font-weight: 700;
  margin-top: 4px;
}

/* CHART CONTAINER */
.chart-container {
    margin-top: 12px;
    height: 120px;
    width: 100%;
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

@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .card-grid { grid-template-columns: 1fr; }
  .number { font-size: 30px; }
  .status-card { padding: 20px; }
  .status-text { font-size: 20px; }
  .status-icon { font-size: 32px; }
}
</style>