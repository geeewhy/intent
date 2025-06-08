//devex-ui/src/main.tsx
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { setupMocks } from './setupMocks'

setupMocks().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
