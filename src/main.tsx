import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { setSecurityHeaders } from './utils/securityHeaders'

// Initialize security headers
setSecurityHeaders();

createRoot(document.getElementById("root")!).render(<App />);
