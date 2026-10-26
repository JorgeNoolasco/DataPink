import { DEMO_EMAIL, DEMO_NAME, DEMO_ROLE } from './demo-config.js';

const SESSION_KEY = 'datapink_demo_session';
const views = ['overview', 'students', 'classes', 'grades'];
const viewElements = Object.fromEntries(views.map((name) => [name, document.querySelector(`#${name}View`)]));
const students = [
  { id: 1, name: 'Beatriz Ramos Lima', email: 'beatriz.demo@example.edu.br', phone: '11900001001', classId: 1 },
  { id: 2, name: 'Gabriel Silva', email: 'gabriel.demo@example.edu.br', phone: '11900001002', classId: 1 },
  { id: 3, name: 'Clara Vasconcelos', email: 'clara.demo@example.edu.br', phone: '11900001003', classId: 2 },
  { id: 4, name: 'Matheus Tofoli', email: 'matheus.demo@example.edu.br', phone: '11900001004', classId: 3 },
];
const classes = [
  { id: 1, course: 'Desenvolvimento de Sistemas', year: 2026, semester: 1, shift: 'Manha', studentCount: 2 },
  { id: 2, course: 'Ciencia de Dados', year: 2026, semester: 1, shift: 'Integral', studentCount: 1 },
  { id: 3, course: 'Redes de Computadores', year: 2026, semester: 1, shift: 'Manha', studentCount: 1 },
];
const grades = [
  { student: 'Beatriz Ramos Lima', course: 'Desenvolvimento de Sistemas', description: 'Projeto de modelagem', value: 9.8 },
  { student: 'Gabriel Silva', course: 'Desenvolvimento de Sistemas', description: 'Consulta com JOIN', value: 8.5 },
  { student: 'Clara Vasconcelos', course: 'Ciencia de Dados', description: 'Integridade referencial', value: 7.6 },
  { student: 'Matheus Tofoli', course: 'Redes de Computadores', description: 'Modelo relacional', value: 9.2 },
];

function getDemoSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    if (session?.mode === 'demo' && session.email === DEMO_EMAIL && session.name === DEMO_NAME && session.role === DEMO_ROLE) {
      return session;
    }
  } catch {
    // An invalid session is cleared before redirecting to the demo login.
  }
  sessionStorage.removeItem(SESSION_KEY);
  window.location.replace('login.html');
  return null;
}

const session = getDemoSession();
if (session) {
  document.querySelector('#userEmail').textContent = session.name;
  document.querySelector('#userRole').textContent = session.role;
  document.querySelector('#demoNotice').hidden = false;
  document.querySelector('#todayDate').textContent = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).format(new Date());
  document.querySelector('#studentCount').textContent = students.length;
  document.querySelector('#classCount').textContent = classes.length;
  document.querySelector('#enrollmentCount').textContent = students.length;
  document.querySelector('#gradeCount').textContent = grades.length;
  renderStudents('');
  renderClasses();
  renderGrades();
}

function escapeText(value = '') {
  const element = document.createElement('span');
  element.textContent = value;
  return element.innerHTML;
}

function showView(name) {
  if (!viewElements[name]) name = 'overview';
  for (const [key, element] of Object.entries(viewElements)) element.hidden = key !== name;
  document.querySelectorAll('[data-view]').forEach((link) => link.classList.toggle('active', link.dataset.view === name));
  document.querySelector('#breadcrumbTitle').textContent = ({
    overview: 'VISAO GERAL', students: 'ALUNOS', classes: 'TURMAS', grades: 'AVALIACOES',
  })[name];
}

function renderStudents(query = '') {
  const tbody = document.querySelector('#studentsTable');
  const term = query.trim().toLocaleLowerCase('pt-BR');
  const filtered = students.filter((item) => `${item.name} ${item.email}`.toLocaleLowerCase('pt-BR').includes(term));
  document.querySelector('#studentTotal').textContent = `${filtered.length} ${filtered.length === 1 ? 'aluno' : 'alunos'}`;
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="table-placeholder">Nenhum registro de demonstracao.</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map((item) => {
    const className = classes.find((entry) => entry.id === item.classId)?.course || 'Sem turma';
    return `<tr><td><strong>${escapeText(item.name)}</strong></td><td>${escapeText(item.email)}</td><td>${escapeText(item.phone)}</td><td>${escapeText(className)}</td></tr>`;
  }).join('');
}

function renderClasses() {
  const rows = classes.map((item) => `<tr><td><strong>${escapeText(item.course)}</strong></td><td>${item.year} / ${item.semester}&ordm;</td><td>${escapeText(item.shift)}</td><td>${escapeText(DEMO_NAME)}</td><td>${item.studentCount}</td></tr>`).join('');
  document.querySelector('#classesTable').innerHTML = rows || '<tr><td colspan="5" class="table-placeholder">Nenhuma turma de demonstracao.</td></tr>';
  document.querySelector('#dashboardClasses').innerHTML = classes.slice(0, 5).map((item) => `<tr><td><strong>${escapeText(item.course)}</strong></td><td>${item.year} / ${item.semester}&ordm;</td><td>${escapeText(item.shift)}</td><td>${item.studentCount}</td></tr>`).join('') || '<tr><td colspan="4" class="table-placeholder">Nenhuma turma de demonstracao.</td></tr>';
}

function renderGrades() {
  document.querySelector('#gradesTable').innerHTML = grades.map((item) => `<tr><td><strong>${escapeText(item.student)}</strong></td><td>${escapeText(item.course)}</td><td>${escapeText(item.description)}</td><td>${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}</td></tr>`).join('') || '<tr><td colspan="4" class="table-placeholder">Nenhuma avaliacao de demonstracao.</td></tr>';
}

document.querySelectorAll('[data-view]').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  showView(link.dataset.view);
}));
document.querySelectorAll('[data-view-link]').forEach((link) => link.addEventListener('click', () => showView(link.dataset.viewLink)));
document.querySelector('#studentSearch').addEventListener('input', (event) => renderStudents(event.target.value));
document.querySelector('#logoutButton').addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.replace('login.html');
});
