import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
const root = document.getElementById('root');
if (!root) throw new Error('Missing root');
createRoot(root).render(<StrictMode><main><h1>Choices</h1><p>Tu préfères… découvrir qui tu es ?</p><p>Le moteur est prêt. Le parcours de jeu arrive à l’étape 3.</p></main></StrictMode>);
