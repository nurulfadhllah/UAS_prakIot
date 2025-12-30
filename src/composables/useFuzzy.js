// src/composables/useFuzzy.js
import { ref } from 'vue';

// Kita gunakan state global (di luar fungsi) agar nilainya sinkron di semua komponen
const status = ref('MENUNGGU...');
const fuzzyLevel = ref(0);

export function useFuzzy() {
  
  // Fungsi helper untuk menentukan warna berdasarkan status
  const getStatusColor = () => {
    if (status.value === 'AMAN') return 'bg-green-500'; // Sesuaikan dengan CSS framework kamu
    if (status.value === 'WASPADA') return 'bg-yellow-500';
    if (status.value === 'BAHAYA') return 'bg-red-600 animate-pulse';
    return 'bg-gray-400';
  };

  return {
    status,
    fuzzyLevel,
    getStatusColor
  };
}