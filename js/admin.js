import { supabase, isSupabaseConfigured, setupMessage } from './supabase.js';

const views = ['overview', 'students', 'classes'];
const viewElements = Object.fromEntries(views.map((name) => [name, document.querySelector(`#${name}View`)]));
const dialog = document.querySelector('#studentDialog');
const form = document.querySelector('#studentForm');
const formMessage = document.querySelector('#studentFormMessage');
let students = [];
let classes = [];

function notify(text, isError = false) {
  const toast = document.querySelector('#toast');
  toast.textContent = text;
  toast.classList.toggle('error', isError);
  toast.classList.add('visible');
  window.clearTimeout(notify.timeoutId);
  notify.timeoutId = window.setTimeout(() => toast.classList.remove('visible'), 3600);
}

function showView(name) {
  if (!viewElements[name]) name = 'overview';
  for (const [key, element] of Object.entries(viewElements)) element.hidden = key !== name;
  document.querySelectorAll('[data-view]').forEach((link) => link.classList.toggle('active', link.dataset.view === name));
  document.querySelector('#breadcrumbTitle').textContent = name === 'overview' ? 'VISÃO GERAL' : name === 'students' ? 'ALUNOS' : 'TURMAS';
}

document.querySelectorAll('[data-view]').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  showView(link.dataset.view);
}));
document.querySelectorAll('[data-view-link]').forEach((link) => link.addEventListener('click', () => showView(link.dataset.viewLink)));
document.querySelector('#todayDate').textContent = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());

function escapeText(value = '') {
  const node = document.createElement('span');
  node.textContent = value;
  return node.innerHTML;
}

function showTableMessage(target, columns, text) {
  target.innerHTML = `<tr><td colspan="${columns}" class="table-placeholder">${escapeText(text)}</td></tr>`;
}

function classLabel(classId) {
  const item = classes.find((entry) => entry.id_turma === classId);
  return item ? `${item.curso?.nome_curso ?? 'Curso'} · ${item.ano_letivo}/${item.semestre_turma}` : '—';
}

function renderStudents(query = '') {
  const tbody = document.querySelector('#studentsTable');
  const needle = query.trim().toLocaleLowerCase('pt-BR');
  const rows = students.filter((student) => `${student.nome_aluno} ${student.email_aluno}`.toLocaleLowerCase('pt-BR').includes(needle));
  document.querySelector('#studentTotal').textContent = `${rows.length} ${rows.length === 1 ? 'aluno' : 'alunos'}`;
  if (!rows.length) return showTableMessage(tbody, 5, needle ? 'Nenhum resultado para esta busca.' : 'Nenhum aluno cadastrado.');
  tbody.innerHTML = rows.map((student) => `<tr><td><strong>${escapeText(student.nome_aluno)}</strong></td><td>${escapeText(student.email_aluno)}</td><td>${escapeText(student.telefone_aluno || '—')}</td><td>${escapeText((student.matricula || []).map((enrollment) => classLabel(enrollment.id_turma)).join(', ') || '—')}</td><td class="row-actions"><button class="row-action" data-edit="${student.id_aluno}">Editar</button><button class="row-action delete" data-delete="${student.id_aluno}">Excluir</button></td></tr>`).join('');
  tbody.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => openStudent(students.find((student) => student.id_aluno === Number(button.dataset.edit)))));
  tbody.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => deleteStudent(Number(button.dataset.delete))));
}

function renderClasses() {
  const targets = [document.querySelector('#classesTable'), document.querySelector('#dashboardClasses')];
  if (!classes.length) {
    showTableMessage(targets[0], 5, 'Nenhuma turma cadastrada.');
    showTableMessage(targets[1], 4, 'Nenhuma turma cadastrada.');
    return;
  }
  targets[0].innerHTML = classes.map((item) => `<tr><td><strong>${escapeText(item.curso?.nome_curso || 'Curso')}</strong></td><td>${item.ano_letivo} / ${item.semestre_turma}º</td><td>${escapeText(item.turno_turma)}</td><td>${escapeText(item.professor?.nome_professor || '—')}</td><td>${item.matricula?.length || 0}</td></tr>`).join('');
  targets[1].innerHTML = classes.slice(0, 5).map((item) => `<tr><td><strong>${escapeText(item.curso?.nome_curso || 'Curso')}</strong></td><td>${item.ano_letivo} / ${item.semestre_turma}º</td><td>${escapeText(item.turno_turma)}</td><td>${item.matricula?.length || 0}</td></tr>`).join('');
}

async function loadData() {
  const [studentResult, classResult] = await Promise.all([
    supabase.from('aluno').select('id_aluno,nome_aluno,email_aluno,telefone_aluno,data_nascimento,matricula(id_turma)').order('nome_aluno'),
    supabase.from('turma').select('id_turma,ano_letivo,semestre_turma,turno_turma,curso:curso(nome_curso),professor:professor(nome_professor),matricula(id_matricula)').order('ano_letivo', { ascending: false }),
  ]);
  if (studentResult.error) throw studentResult.error;
  if (classResult.error) throw classResult.error;
  students = studentResult.data || [];
  classes = classResult.data || [];
  document.querySelector('#studentCount').textContent = students.length;
  document.querySelector('#classCount').textContent = classes.length;
  document.querySelector('#enrollmentCount').textContent = classes.reduce((sum, item) => sum + (item.matricula?.length || 0), 0);
  renderStudents(document.querySelector('#studentSearch').value);
  renderClasses();
}

function openStudent(student = null) {
  form.reset();
  formMessage.textContent = '';
  document.querySelector('#studentId').value = student?.id_aluno || '';
  document.querySelector('#dialogTitle').textContent = student ? 'Editar aluno' : 'Novo aluno';
  document.querySelector('#studentName').value = student?.nome_aluno || '';
  document.querySelector('#studentEmail').value = student?.email_aluno || '';
  document.querySelector('#studentBirth').value = student?.data_nascimento || '';
  document.querySelector('#studentBirth').max = new Date().toISOString().slice(0, 10);
  document.querySelector('#studentPhone').value = student?.telefone_aluno?.trim() || '';
  const classSelect = document.querySelector('#studentClass');
  classSelect.innerHTML = '<option value="">Sem turma por enquanto</option>' + classes.map((item) => `<option value="${item.id_turma}">${escapeText(item.curso?.nome_curso || 'Curso')} · ${item.ano_letivo}/${item.semestre_turma}</option>`).join('');
  classSelect.value = student?.matricula?.[0]?.id_turma || '';
  dialog.showModal();
}

async function deleteStudent(id) {
  const student = students.find((entry) => entry.id_aluno === id);
  if (!student || !window.confirm(`Excluir o cadastro de ${student.nome_aluno}? As matrículas e notas relacionadas também serão removidas.`)) return;
  const { error } = await supabase.from('aluno').delete().eq('id_aluno', id);
  if (error) {
    notify(`Não foi possível excluir o aluno: ${error.message}`, true);
    return;
  }
  await refresh();
  notify('Cadastro do aluno excluído.');
}

async function refresh() {
  try {
    await loadData();
    document.querySelector('#dashboardMessage').textContent = '';
  } catch (error) {
    document.querySelector('#dashboardMessage').textContent = `Erro ao carregar dados: ${error.message}`;
  }
}

document.querySelector('#studentSearch').addEventListener('input', (event) => renderStudents(event.target.value));
document.querySelector('#addStudentButton').addEventListener('click', () => openStudent());
document.querySelectorAll('.dialog-close').forEach((button) => button.addEventListener('click', () => dialog.close()));
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formMessage.textContent = '';
  const id = document.querySelector('#studentId').value;
  const selectedClass = document.querySelector('#studentClass').value;
  const values = {
    nome_aluno: document.querySelector('#studentName').value.trim(),
    email_aluno: document.querySelector('#studentEmail').value.trim(),
    data_nascimento: document.querySelector('#studentBirth').value,
    telefone_aluno: document.querySelector('#studentPhone').value.replace(/\D/g, '') || null,
  };
  if (values.telefone_aluno && !/^\d{10,11}$/.test(values.telefone_aluno)) {
    formMessage.textContent = 'Informe um telefone com DDD e 10 ou 11 dígitos.';
    return;
  }
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    let studentId = Number(id);
    if (id) {
      const { error } = await supabase.from('aluno').update(values).eq('id_aluno', studentId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from('aluno').insert(values).select('id_aluno').single();
      if (error) throw error;
      studentId = data.id_aluno;
    }
    if (selectedClass && !students.find((student) => student.id_aluno === studentId)?.matricula?.some((item) => item.id_turma === Number(selectedClass))) {
      const { error } = await supabase.from('matricula').insert({ id_aluno: studentId, id_turma: Number(selectedClass), situacao_matricula: 'Ativa' });
      if (error) {
        if (!id) await supabase.from('aluno').delete().eq('id_aluno', studentId);
        throw error;
      }
    }
    dialog.close();
    await refresh();
    notify(id ? 'Cadastro do aluno atualizado.' : 'Aluno cadastrado com sucesso.');
  } catch (error) {
    formMessage.textContent = `Não foi possível salvar: ${error.message}`;
    notify('Não foi possível salvar o cadastro.', true);
  } finally {
    button.disabled = false;
  }
});
document.querySelector('#logoutButton').addEventListener('click', async () => {
  if (!supabase) return window.location.replace('login.html');
  await supabase.auth.signOut();
  window.location.replace('login.html');
});

async function start() {
  if (!isSupabaseConfigured) {
    document.querySelector('#dashboardMessage').textContent = setupMessage;
    return;
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return window.location.replace('login.html');
    document.querySelector('#userEmail').textContent = session.user.email || 'Docente';
    const { data: teacher, error: teacherError } = await supabase.from('professor').select('id_professor').eq('id_auth', session.user.id).maybeSingle();
    if (teacherError || !teacher) {
      await supabase.auth.signOut();
      return window.location.replace('login.html');
    }
    await refresh();
  } catch (error) {
    document.querySelector('#dashboardMessage').textContent = `Não foi possível verificar o acesso: ${error.message}`;
  }
}

start();
