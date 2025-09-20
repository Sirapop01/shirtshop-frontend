import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080", // ปรับให้ตรงกับ backend ของคุณ
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
