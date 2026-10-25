import { supabase, isSupabaseConfigured, setupMessage } from './supabase.js';

const form = document.querySelector('#loginForm');
const message = document.querySelector('#loginMessage');
const toggle = document.querySelector('.password-toggle');
const password = document.querySelector('#password');

toggle.addEventListener('click', () => {
  const show = password.type === 'password';
  password.type = show ? 'text' : 'password';
  toggle.setAttribute('aria-pressed', String(show));
  toggle.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';
  if (!isSupabaseConfigured) {
    message.textContent = setupMessage;
    return;
  }
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  button.textContent = 'Entrando...';
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email.value.trim(), password: form.password.value,
    });
    if (error) throw error;
    const { data: teacher, error: teacherError } = await supabase
      .from('professor').select('id_professor').eq('id_auth', data.user.id).maybeSingle();
    if (teacherError || !teacher) {
      await supabase.auth.signOut();
      throw new Error('Esta conta não está cadastrada como docente. Peça ao administrador para cadastrá-la.');
    }
    window.location.replace('admin.html');
  } catch (error) {
    message.textContent = error.message || 'Não foi possível entrar. Confira seus dados e tente novamente.';
    button.disabled = false;
    button.innerHTML = 'Entrar no painel <span aria-hidden="true">↗</span>';
  }
});

if (isSupabaseConfigured) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) window.location.replace('admin.html');
  });
}
