import { supabase, isSupabaseConfigured } from './supabase.js';

const grid = document.querySelector('#projectsGrid');
const message = document.querySelector('#projectsMessage');
const colors = ['violet', 'blue', 'yellow'];
const symbols = ['✳', '↗', '◌', '⌘', '✦', '∞'];

function renderCourses(courses) {
  grid.innerHTML = '';
  for (const [index, course] of courses.entries()) {
    const card = document.createElement('article');
    card.className = 'project-card';
    const visual = document.createElement('div');
    visual.className = `project-visual ${colors[index % colors.length]}`;
    const symbol = document.createElement('span');
    symbol.textContent = symbols[index % symbols.length];
    visual.append(symbol);
    const meta = document.createElement('span');
    meta.className = 'project-meta';
    meta.textContent = `${String(index + 1).padStart(2, '0')} / EM DESTAQUE`;
    const title = document.createElement('h3');
    title.textContent = course.nome_curso;
    const description = document.createElement('p');
    description.textContent = course.descricao_curso || 'Uma jornada de aprendizagem em andamento.';
    card.append(visual, meta, title, description);
    grid.append(card);
  }
}

if (!isSupabaseConfigured) {
  grid.replaceChildren();
  message.hidden = false;
  message.textContent = 'Conecte o Supabase para publicar os cursos em destaque.';
} else {
  supabase.from('vw_portfolio_cursos').select('nome_curso,descricao_curso')
    .then(({ data, error }) => {
      grid.replaceChildren();
      if (error) throw error;
      if (!data?.length) {
        message.hidden = false;
        message.textContent = 'Os cursos em destaque aparecerão aqui em breve.';
        return;
      }
      renderCourses(data);
    })
    .catch(() => {
      grid.replaceChildren();
      message.hidden = false;
      message.textContent = 'Não foi possível carregar os cursos. Verifique a configuração do projeto.';
    });
}
