<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { QIcon, QCard, QCardSection } from "quasar";
import Chart from "chart.js/auto";
import { MQTTService } from "./Services/MQTT";

/* ===============================
   COMPOSABLES (FILE .VUE)
================================ */
import { useSuhu } from "../src/composables/useSuhu.vue";
import { useKelembapan } from "../src/composables/useKelembapan.vue";
import { useAsap } from "../src/composables/useAsap.vue";
import { useApi } from "../src/composables/useApi.vue";

/* ===============================
   DATA SENSOR (UI)
================================ */
const data = ref([
  { title: "Suhu", value: 0, unit: "°C", icon: "thermostat", color: "#ff7675" },
  { title: "Kelembapan", value: 0, unit: "% RH", icon: "water_drop", color: "#74b9ff" },
  { title: "Asap", value: 0, unit: "PPM", icon: "cloud", color: "#55efc4" },
  { title: "Api", value: 0, unit: "%", icon: "local_fire_department", color: "#ff6b00" }
]);

/* ===============================
   COMPOSABLE STATE
================================ */
const { suhu, onMessage: suhuMsg } = useSuhu();
const { kelembapan, onMessage: humMsg } = useKelembapan();
const { asap, onMessage: asapMsg } = useAsap();
const { api, onMessage: apiMsg } = useApi();

/* ===============================
   CHART
================================ */
const charts = [];

function initChart(i, color) {
  const ctx = document.getElementById(`chart-${i}`);
  if (!ctx) return;

  charts[i] = new Chart(ctx, {
    type: "line",
    data: {
      labels: Array(15).fill(""),
      datasets: [{
        data: Array(15).fill(0),
        borderColor: color,
        backgroundColor: color,
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#fff",
        pointBorderWidth: 2,
        pointBorderColor: color
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

function pushChart(i, value) {
  const c = charts[i];
  if (!c) return;
  c.data.datasets[0].data.push(value);
  c.data.datasets[0].data.shift();
  c.update();
}

/* ===============================
   FUZZY LOGIC
================================ */
const dangerLevel = ref(0);
const fuzzyActive = ref(false);

function fuzzyMembership(v, l, m, h) {
  return {
    low: Math.max(0, Math.min((m - v) / (m - l), 1)),
    mid: Math.max(0, 1 - Math.abs(v - m) / (h - l)),
    high: Math.max(0, Math.min((v - m) / (h - m), 1))
  };
}

function runFuzzyLogic() {
  if (!fuzzyActive.value) return;

  const s = fuzzyMembership(data.value[0].value, 20, 30, 40);
  const h = fuzzyMembership(data.value[1].value, 30, 50, 70);
  const a = fuzzyMembership(data.value[2].value, 50, 150, 300);
  const f = fuzzyMembership(data.value[3].value, 0, 30, 60);

  const r = Math.max(s.low, h.low, a.low, f.low);
  const m = Math.max(s.mid, h.mid, a.mid, f.mid);
  const t = Math.max(s.high, h.high, a.high, f.high);

  dangerLevel.value = Math.round(
    ((r * 20) + (m * 50) + (t * 90)) / (r + m + t || 1)
  );
}

/* ===============================
   STATUS
================================ */
const dangerStatus = computed(() =>
  dangerLevel.value <= 30 ? "Normal" :
  dangerLevel.value <= 60 ? "Siaga" :
  "Bahaya"
);

const dangerColor = computed(() =>
  dangerLevel.value <= 30 ? "#2e7d32" :
  dangerLevel.value <= 60 ? "#ff8f00" :
  "#c62828"
);

/* ===============================
   WATCH SENSOR
================================ */
watch(suhu, v => {
  data.value[0].value = v;
  pushChart(0, v);
  runFuzzyLogic();
});

watch(kelembapan, v => {
  data.value[1].value = v;
  pushChart(1, v);
  runFuzzyLogic();
});

watch(asap, v => {
  data.value[2].value = v;
  pushChart(2, v);
  runFuzzyLogic();
});

watch(api, v => {
  data.value[3].value = v;
  pushChart(3, v);
  runFuzzyLogic();
});

/* ===============================
   MQTT HANDLER
================================ */
function handleMQTTMessage(topic, message) {
  suhuMsg(topic, message);
  humMsg(topic, message);
  asapMsg(topic, message);
  apiMsg(topic, message);
}

/* ===============================
   MOUNTED
================================ */
onMounted(() => {
  data.value.forEach((d, i) => initChart(i, d.color));

  const mqtt = new MQTTService(
    "ws://broker.hivemq.com:8000/mqtt",
    {
      onConnect: () => {
        mqtt.subscribe("sensor/suhu");
        mqtt.subscribe("sensor/kelembapan");
        mqtt.subscribe("sensor/asap");
        mqtt.subscribe("sensor/api");
        fuzzyActive.value = true;
      },
      onMessage: handleMQTTMessage
    }
  );

  mqtt.connect();
});
</script>

<template>
  <div class="dashboard">

    <div class="header">
      <q-icon name="sensors" size="30px" />
      <span>Sistem Fire Alarm</span>
    </div>

    <div class="content">
      <div class="card-grid">

        <q-card v-for="(item, i) in data" :key="i" class="card">
          <q-card-section class="card-body">

            <canvas :id="`chart-${i}`" height="80"></canvas>

            <div class="icon" :style="{ background: item.color }">
              <q-icon :name="item.icon" size="24px" />
            </div>

            <h3 class="title">{{ item.title }}</h3>

            <div class="value-wrap">
              <span class="number">{{ item.value }}</span>
              <span class="unit">{{ item.unit }}</span>
            </div>

          </q-card-section>
        </q-card>

        <q-card class="card status-card" :style="{ borderColor: dangerColor }">
          <q-card-section class="status-body">

            <div class="status-icon" :style="{ background: dangerColor }">
              <q-icon name="warning" size="42px" />
            </div>

            <h2 class="status-text" :style="{ color: dangerColor }">
              {{ dangerStatus }}
            </h2>

            <p class="percent" :style="{ color: dangerColor }">
              {{ dangerLevel }}%
            </p>

          </q-card-section>
        </q-card>

      </div>
    </div>

    <div class="footer">
      COPYRIGHT BY KELOMPOK 8
    </div>

  </div>
</template>

<style scoped>
.dashboard {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(145deg, #eef3ff, #dff8f4);
  font-family: "Poppins", sans-serif;
}

.header {
  height: 68px;
  background: linear-gradient(135deg, #3f51ff, #6a2cff);
  color: white;
  font-size: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 6px 18px rgba(0,0,0,.25);
}

.content {
  flex: 1;
  padding: 36px 24px;
  display: flex;
  justify-content: center;
}

.card-grid {
  width: 100%;
  max-width: 900px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 28px;
}

.card {
  border-radius: 22px;
  box-shadow: 0 12px 26px rgba(0,0,0,.12);
}

.card-body {
  padding: 22px 20px 26px;
  text-align: center;
}

.icon {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  margin: 14px auto 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.title {
  font-size: 15px;
  font-weight: 600;
}

.value-wrap {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 6px;
}

.number {
  font-size: 28px;
  font-weight: 800;
}

.unit {
  font-size: 13px;
  opacity: .7;
}

.status-card {
  grid-column: span 2;
  border: 3px solid;
}

.status-body {
  padding: 30px;
  text-align: center;
}

.status-icon {
  width: 76px;
  height: 76px;
  border-radius: 20px;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.status-text {
  font-size: 24px;
  font-weight: 700;
}

.percent {
  font-size: 36px;
  font-weight: 900;
}

.footer {
  height: 56px;
  background: linear-gradient(135deg, #3f51ff, #6a2cff);
  color: white;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 -4px 12px rgba(0,0,0,.2);
}
</style>
