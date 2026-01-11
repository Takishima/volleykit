import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { initSessionToken } from "./api/form-serialization";

// Initialize encrypted session token from storage before rendering
// This ensures the token is available for any API requests during app startup
initSessionToken()
  .catch(() => {
    // Ignore initialization errors - app will work without persisted session
  })
  .finally(() => {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
