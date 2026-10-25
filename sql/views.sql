-- Boletim autenticado: SECURITY INVOKER aplica as policies RLS das tabelas base.
CREATE VIEW public.vw_boletim_aluno WITH (security_invoker = true) AS
SELECT
    a.id_aluno,
    a.nome_aluno,
    c.nome_curso,
    t.id_turma,
    m.id_matricula,
    m.situacao_matricula,
    n.id_nota,
    n.descricao_nota,
    n.valor_nota,
    n.data_nota
FROM public.aluno a
JOIN public.matricula m ON m.id_aluno = a.id_aluno
JOIN public.turma t ON t.id_turma = m.id_turma
JOIN public.curso c ON c.id_curso = t.id_curso
LEFT JOIN public.nota n ON n.id_matricula = m.id_matricula;

GRANT SELECT ON public.vw_boletim_aluno TO authenticated;

-- Vitrine pública deliberadamente limitada a nome e descrição de cursos com turma.
CREATE VIEW public.vw_portfolio_cursos WITH (security_barrier = true, security_invoker = false) AS
SELECT c.nome_curso, c.descricao_curso
FROM public.curso c
WHERE EXISTS (SELECT 1 FROM public.turma t WHERE t.id_curso = c.id_curso);

GRANT SELECT ON public.vw_portfolio_cursos TO anon, authenticated;
