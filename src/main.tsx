import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
const root = document.getElementById('root');
if (!root) throw new Error('Missing root');
createRoot(root).render(<StrictMode><main><img src="./dilemma-mark.png" alt="" width="96"/><h1>Dilemme</h1><p>Deux choix. Aucune réponse facile.</p><p>Le moteur est prêt. Le parcours de jeu arrive à l’étape 3.</p></main></StrictMode>);
