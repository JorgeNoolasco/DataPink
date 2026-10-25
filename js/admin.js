import { supabase, isSupabaseConfigured, setupMessage } from './supabase.js';

const views = ['overview', 'students', 'classes', 'grades'];
const viewElements = Object.fromEntries(views.map((name) => [name, document.querySelector(`#${name}View`)]));
const dialog = document.querySelector('#studentDialog');
const form = document.querySelector('#studentForm');
const formMessage = document.querySelector('#studentFormMessage');
const gradeDialog = document.querySelector('#gradeDialog');
const gradeForm = document.querySelector('#gradeForm');
const classDialog = document.querySelector('#classDialog');
const classForm = document.querySelector('#classForm');
let students = [];
let classes = [];
let grades = [];
let enrollments = [];
let courses = [];
let teacherId = null;

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
  document.querySelector('#breadcrumbTitle').textContent = ({ overview: 'VISÃO GERAL', students: 'ALUNOS', classes: 'TURMAS', grades: 'AVALIAÇÕES' })[name];
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

function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
    showTableMessage(targets[0], 6, 'Nenhuma turma cadastrada.');
    showTableMessage(targets[1], 4, 'Nenhuma turma cadastrada.');
    return;
  }
  targets[0].innerHTML = classes.map((item) => `<tr><td><strong>${escapeText(item.curso?.nome_curso || 'Curso')}</strong></td><td>${item.ano_letivo} / ${item.semestre_turma}º</td><td>${escapeText(item.turno_turma)}</td><td>${escapeText(item.professor?.nome_professor || '—')}</td><td>${item.matricula?.length || 0}</td><td class="row-actions"><button class="row-action" data-class-edit="${item.id_turma}">Editar</button><button class="row-action delete" data-class-delete="${item.id_turma}">Excluir</button></td></tr>`).join('');
  targets[1].innerHTML = classes.slice(0, 5).map((item) => `<tr><td><strong>${escapeText(item.curso?.nome_curso || 'Curso')}</strong></td><td>${item.ano_letivo} / ${item.semestre_turma}º</td><td>${escapeText(item.turno_turma)}</td><td>${item.matricula?.length || 0}</td></tr>`).join('');
  targets[0].querySelectorAll('[data-class-edit]').forEach((button) => button.addEventListener('click', () => openClass(classes.find((item) => item.id_turma === Number(button.dataset.classEdit)))));
  targets[0].querySelectorAll('[data-class-delete]').forEach((button) => button.addEventListener('click', () => deleteClass(Number(button.dataset.classDelete))));
}

function renderGrades() {
  const tbody = document.querySelector('#gradesTable');
  if (!grades.length) return showTableMessage(tbody, 5, 'Nenhuma avaliação registrada.');
  tbody.innerHTML = grades.map((grade) => `<tr><td><strong>${escapeText(grade.nome_aluno)}</strong></td><td>${escapeText(grade.nome_curso)}</td><td>${escapeText(grade.descricao_nota)}</td><td>${Number(grade.valor_nota).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</td><td class="row-actions"><button class="row-action" data-grade-edit="${grade.id_nota}">Editar</button><button class="row-action delete" data-grade-delete="${grade.id_nota}">Excluir</button></td></tr>`).join('');
  tbody.querySelectorAll('[data-grade-edit]').forEach((button) => button.addEventListener('click', () => openGrade(grades.find((grade) => grade.id_nota === Number(button.dataset.gradeEdit)))));
  tbody.querySelectorAll('[data-grade-delete]').forEach((button) => button.addEventListener('click', () => deleteGrade(Number(button.dataset.gradeDelete))));
}

async function loadData() {
  const [studentResult, classResult, gradeResult, enrollmentResult, courseResult] = await Promise.all([
    supabase.from('aluno').select('id_aluno,nome_aluno,email_aluno,telefone_aluno,data_nascimento,matricula(id_matricula,id_turma)').order('nome_aluno'),
    supabase.from('turma').select('id_turma,id_professor,id_curso,ano_letivo,semestre_turma,turno_turma,curso:curso(nome_curso),professor:professor(nome_professor),matricula(id_matricula)').order('ano_letivo', { ascending: false }),
    supabase.from('vw_boletim_aluno').select('id_nota,id_matricula,nome_aluno,nome_curso,descricao_nota,valor_nota,data_nota').not('id_nota', 'is', null).order('data_nota', { ascending: false }),
    supabase.from('matricula').select('id_matricula,aluno:aluno(nome_aluno),turma:turma(ano_letivo,semestre_turma,curso:curso(nome_curso))').order('id_matricula', { ascending: false }),
    supabase.from('curso').select('id_curso,nome_curso').order('nome_curso'),
  ]);
  if (studentResult.error) throw studentResult.error;
  if (classResult.error) throw classResult.error;
  if (gradeResult.error) throw gradeResult.error;
  if (enrollmentResult.error) throw enrollmentResult.error;
  if (courseResult.error) throw courseResult.error;
  students = studentResult.data || [];
  classes = classResult.data || [];
  grades = gradeResult.data || [];
  enrollments = enrollmentResult.data || [];
  courses = courseResult.data || [];
  document.querySelector('#studentCount').textContent = students.length;
  document.querySelector('#classCount').textContent = classes.length;
  document.querySelector('#enrollmentCount').textContent = classes.reduce((sum, item) => sum + (item.matricula?.length || 0), 0);
  document.querySelector('#gradeCount').textContent = grades.length;
  renderStudents(document.querySelector('#studentSearch').value);
  renderClasses();
  renderGrades();
}

function openClass(item = null) {
  classForm.reset();
  document.querySelector('#classId').value = item?.id_turma || '';
  document.querySelector('#classCourse').innerHTML = '<option value="">Selecione um curso</option>' + courses.map((course) => `<option value="${course.id_curso}">${escapeText(course.nome_curso)}</option>`).join('');
  document.querySelector('#classCourse').value = item?.id_curso || '';
  document.querySelector('#classYear').value = item?.ano_letivo || new Date().getFullYear();
  document.querySelector('#classSemester').value = item?.semestre_turma || '1';
  document.querySelector('#classShift').value = item?.turno_turma || 'Manhã';
  document.querySelector('#classFormMessage').textContent = '';
  document.querySelector('#classDialogTitle').textContent = item ? 'Editar turma' : 'Nova turma';
  classDialog.showModal();
}

async function deleteClass(id) {
  const item = classes.find((entry) => entry.id_turma === id);
  if (!item || !window.confirm(`Excluir a turma de ${item.curso?.nome_curso || 'este curso'}? As matrículas e notas desta turma também serão removidas.`)) return;
  const { error } = await supabase.from('turma').delete().eq('id_turma', id);
  if (error) return notify(`Não foi possível excluir a turma: ${error.message}`, true);
  await refresh();
  notify('Turma excluída.');
}

function openGrade(grade = null) {
  gradeForm.reset();
  document.querySelector('#gradeId').value = grade?.id_nota || '';
  document.querySelector('#gradeStudent').innerHTML = '<option value="">Selecione a matrícula</option>' + enrollments.map((item) => `<option value="${item.id_matricula}">${escapeText(item.aluno?.nome_aluno || 'Aluno')} · ${escapeText(item.turma?.curso?.nome_curso || 'Curso')} ${item.turma?.ano_letivo || ''}/${item.turma?.semestre_turma || ''}</option>`).join('');
  document.querySelector('#gradeStudent').value = grade?.id_matricula || '';
  document.querySelector('#gradeDescription').value = grade?.descricao_nota || '';
  document.querySelector('#gradeValue').value = grade?.valor_nota ?? '';
  document.querySelector('#gradeDate').value = grade?.data_nota || localDateValue();
  document.querySelector('#gradeDialogTitle').textContent = grade ? 'Editar avaliação' : 'Lançar avaliação';
  gradeDialog.showModal();
}

async function deleteGrade(id) {
  if (!window.confirm('Excluir esta avaliação?')) return;
  const { error } = await supabase.from('nota').delete().eq('id_nota', id);
  if (error) return notify(`Não foi possível excluir: ${error.message}`, true);
  await refresh();
  notify('Avaliação excluída.');
}

function openStudent(student = null) {
  form.reset();
  formMessage.textContent = '';
  document.querySelector('#studentId').value = student?.id_aluno || '';
  document.querySelector('#dialogTitle').textContent = student ? 'Editar aluno' : 'Novo aluno';
  document.querySelector('#studentName').value = student?.nome_aluno || '';
  document.querySelector('#studentEmail').value = student?.email_aluno || '';
  document.querySelector('#studentBirth').value = student?.data_nascimento || '';
  document.querySelector('#studentBirth').max = localDateValue();
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
document.querySelector('#addGradeButton').addEventListener('click', () => openGrade());
document.querySelector('#addClassButton').addEventListener('click', () => openClass());
document.querySelectorAll('[data-create]').forEach((button) => button.addEventListener('click', () => {
  ({ student: openStudent, class: openClass, grade: openGrade })[button.dataset.create]();
}));
document.querySelectorAll('#studentDialog .dialog-close').forEach((button) => button.addEventListener('click', () => dialog.close()));
document.querySelectorAll('.grade-dialog-close').forEach((button) => button.addEventListener('click', () => gradeDialog.close()));
document.querySelectorAll('.class-dialog-close').forEach((button) => button.addEventListener('click', () => classDialog.close()));
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
  const existingStudent = id ? students.find((student) => student.id_aluno === Number(id)) : null;
  const currentEnrollment = existingStudent?.matricula?.[0];
  if (currentEnrollment && !selectedClass && !window.confirm('Remover a matrícula? As avaliações vinculadas também serão excluídas.')) return;
  if (currentEnrollment && selectedClass && currentEnrollment.id_turma !== Number(selectedClass)
    && !window.confirm('Mover esta matrícula? As avaliações existentes passarão a pertencer à nova turma.')) return;
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
    if (selectedClass) {
      const enrollmentChange = currentEnrollment
        ? supabase.from('matricula').update({ id_turma: Number(selectedClass) }).eq('id_matricula', currentEnrollment.id_matricula)
        : supabase.from('matricula').insert({ id_aluno: studentId, id_turma: Number(selectedClass), situacao_matricula: 'Ativa' });
      const { error } = await enrollmentChange;
      if (error) {
        if (!id) await supabase.from('aluno').delete().eq('id_aluno', studentId);
        throw error;
      }
    } else if (currentEnrollment) {
      const { error } = await supabase.from('matricula').delete().eq('id_matricula', currentEnrollment.id_matricula);
      if (error) throw error;
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
classForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = document.querySelector('#classId').value;
  const values = {
    id_curso: Number(document.querySelector('#classCourse').value),
    ano_letivo: Number(document.querySelector('#classYear').value),
    semestre_turma: Number(document.querySelector('#classSemester').value),
    turno_turma: document.querySelector('#classShift').value,
  };
  if (!id) values.id_professor = teacherId;
  const button = classForm.querySelector('[type="submit"]');
  const message = document.querySelector('#classFormMessage');
  message.textContent = '';
  button.disabled = true;
  try {
    const result = id
      ? await supabase.from('turma').update(values).eq('id_turma', Number(id))
      : await supabase.from('turma').insert(values);
    if (result.error) throw result.error;
    classDialog.close();
    await refresh();
    notify(id ? 'Turma atualizada.' : 'Turma criada.');
  } catch (error) {
    message.textContent = `Não foi possível salvar: ${error.message}`;
  } finally {
    button.disabled = false;
  }
});
gradeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = document.querySelector('#gradeId').value;
  const values = {
    id_matricula: Number(document.querySelector('#gradeStudent').value),
    descricao_nota: document.querySelector('#gradeDescription').value.trim(),
    valor_nota: Number(document.querySelector('#gradeValue').value),
    data_nota: document.querySelector('#gradeDate').value,
  };
  const button = gradeForm.querySelector('[type="submit"]');
  button.disabled = true;
  document.querySelector('#gradeFormMessage').textContent = '';
  try {
    const result = id
      ? await supabase.from('nota').update(values).eq('id_nota', Number(id))
      : await supabase.from('nota').insert(values);
    if (result.error) throw result.error;
    gradeDialog.close();
    await refresh();
    notify(id ? 'Avaliação atualizada.' : 'Avaliação registrada.');
  } catch (error) {
    document.querySelector('#gradeFormMessage').textContent = `Não foi possível salvar: ${error.message}`;
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
    teacherId = teacher.id_professor;
    await refresh();
  } catch (error) {
    document.querySelector('#dashboardMessage').textContent = `Não foi possível verificar o acesso: ${error.message}`;
  }
}

start();
