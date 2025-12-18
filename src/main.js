import { createApp } from "vue";
import { Quasar } from "quasar";
import App from "./App.vue";

import "./index.sass";
import "@quasar/extras/material-icons/material-icons.css";

const app = createApp(App);

app.use(Quasar, {
  plugins: {}
});

app.mount("#app");
