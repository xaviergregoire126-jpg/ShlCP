import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Force clean compilation trigger
createRoot(document.getElementById('root')!).render(<App />);
