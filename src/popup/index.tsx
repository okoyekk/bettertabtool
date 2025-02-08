import React from 'react';
import App from './App';
import './index.css';
import { createRoot } from 'react-dom/client';

// TODO find a way trigger popup for custom notifications

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
