export function mqttRouter(topic, message, data, charts, runFuzzyLogic) {
  const value = parseFloat(message.toString());
  if (isNaN(value)) return;

  const routes = {
    "sensor/suhu": 0,
    "sensor/kelembapan": 1,
    "sensor/asap": 2,
    "sensor/api": 3
  };

  const index = routes[topic];
  if (index === undefined) return;

  // update nilai sensor
  data.value[index].value = value;

  // update chart
  const chart = charts[index];
  if (chart) {
    chart.data.datasets[0].data.push(value);
    chart.data.datasets[0].data.shift();
    chart.update();
  }

  // update fuzzy
  runFuzzyLogic();
}