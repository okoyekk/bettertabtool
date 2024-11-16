import React from 'react';
import App from './App';
import { createRoot } from 'react-dom/client';

// chrome.runtime.onMessage.addListener(function (message, sender, response) {
//     const { type } = message;

//     if (type === "URL_COPIED") {
//         console.log("URL COPIED!!!");
//     }
// })
// TODO find a way trigger popup for custom notifications

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
