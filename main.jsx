import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Register Service Worker for PWA Installation & Offline Support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      console.log("PWA Service Worker registered successfully:", reg.scope);
    }).catch((err) => {
      console.warn("PWA Service Worker registration failed:", err);
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
