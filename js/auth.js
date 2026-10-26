import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_NAME, DEMO_ROLE } from './demo-config.js';

const SESSION_KEY = 'datapink_demo_session';
const form = document.querySelector('#loginForm');
const message = document.querySelector('#loginMessage');
const toggle = document.querySelector('.password-toggle');
const password = document.querySelector('#password');
const submitButton = form.querySelector('[type="submit"]');

function hasDemoSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    return session?.mode === 'demo' && session.email === DEMO_EMAIL && session.name === DEMO_NAME && session.role === DEMO_ROLE;
  } catch {
    return false;
  }
}

if (hasDemoSession()) window.location.replace('admin.html');

toggle.addEventListener('click', () => {
  const show = password.type === 'password';
  password.type = show ? 'text' : 'password';
  toggle.setAttribute('aria-pressed', String(show));
  toggle.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  message.textContent = '';
  if (!form.reportValidity()) return;

  const email = form.elements.email.value.trim().toLocaleLowerCase('pt-BR');
  const enteredPassword = form.elements.password.value;
  if (email !== DEMO_EMAIL.toLocaleLowerCase('pt-BR') || enteredPassword !== DEMO_PASSWORD) {
    message.textContent = 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
    password.focus();
    return;
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    mode: 'demo',
    name: DEMO_NAME,
    email: DEMO_EMAIL,
    role: DEMO_ROLE,
    createdAt: new Date().toISOString(),
  }));
  submitButton.disabled = true;
  submitButton.textContent = 'Acessando o painel...';
  window.location.assign('admin.html');
});
