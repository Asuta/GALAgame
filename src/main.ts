import './styles/app.css';
import { createApp } from './app/createApp';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('Missing #app mount point');
}

createApp(root);
