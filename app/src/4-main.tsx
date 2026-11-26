import React from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './App';
import './base.css';
createRoot(document.getElementById('root')!).render(<App/>);
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{});});}
