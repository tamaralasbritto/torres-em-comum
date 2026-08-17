import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import './admin.css';
import { AdminPanel } from './admin';

const hash=window.location.hash;
const isAdminRoute=hash==='#admin'||hash.includes('access_token=')||hash.includes('error_description=');
const isGlossaryRoute=hash==='#glossario';

if(isAdminRoute){
  ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AdminPanel/></React.StrictMode>);
}else if(isGlossaryRoute){
  import('./glossary').then(({Glossary})=>ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Glossary/></React.StrictMode>));
}else{
  import('./topicMain');
}
