import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { loadCommunityQuestions } from "./services/community";
import "@fontsource-variable/inter/wght.css";
import "./style.css";
import "./styles/brand.css";
import "./styles/cards.css";
import "./styles/setup.css";
const root = document.getElementById("root");
if (!root) throw new Error("Missing root");
void loadCommunityQuestions().finally(() =>
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
);
