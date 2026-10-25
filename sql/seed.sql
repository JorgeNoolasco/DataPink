-- Dados demonstrativos fictícios. Remova ou substitua antes de usar em produção.
INSERT INTO public.professor (nome_professor, email_professor, telefone_professor, especialidade_professor)
VALUES
  ('Mariana Costa', 'mariana.costa@example.edu.br', '11987654321', 'Ciências e tecnologia'),
  ('Rafael Lima', 'rafael.lima@example.edu.br', '11976543210', 'Matemática')
ON CONFLICT (email_professor) DO NOTHING;

INSERT INTO public.curso (nome_curso, descricao_curso, cargahoraria_curso)
VALUES
  ('Laboratório de Ideias', 'Pesquisa, prototipagem e pensamento criativo.', 40),
  ('Dados no Cotidiano', 'Uma introdução à leitura e visualização de dados.', 32),
  ('Ciência em Movimento', 'Experimentos e descobertas com o mundo ao redor.', 36)
ON CONFLICT DO NOTHING;

INSERT INTO public.turma (id_curso, id_professor, ano_letivo, semestre_turma, turno_turma)
SELECT c.id_curso, p.id_professor, 2026, 1, 'Manhã'
FROM public.curso c CROSS JOIN public.professor p
WHERE p.email_professor = 'mariana.costa@example.edu.br'
  AND c.nome_curso IN ('Laboratório de Ideias', 'Dados no Cotidiano')
  AND NOT EXISTS (
      SELECT 1 FROM public.turma t
      WHERE t.id_curso = c.id_curso AND t.id_professor = p.id_professor
        AND t.ano_letivo = 2026 AND t.semestre_turma = 1
  );

INSERT INTO public.aluno (nome_aluno, data_nascimento, email_aluno, telefone_aluno)
VALUES
  ('Lia Martins', '2008-05-12', 'lia.martins@example.edu.br', '11911112222'),
  ('Theo Alves', '2007-11-03', 'theo.alves@example.edu.br', '11922223333'),
  ('Nina Rocha', '2008-02-24', 'nina.rocha@example.edu.br', '11933334444')
ON CONFLICT (email_aluno) DO NOTHING;

INSERT INTO public.matricula (id_aluno, id_turma, situacao_matricula)
SELECT a.id_aluno, t.id_turma, 'Ativa'
FROM public.aluno a CROSS JOIN public.turma t CROSS JOIN public.curso c
WHERE t.id_curso = c.id_curso
  AND c.nome_curso = 'Laboratório de Ideias'
  AND a.email_aluno IN ('lia.martins@example.edu.br', 'theo.alves@example.edu.br', 'nina.rocha@example.edu.br')
ON CONFLICT (id_aluno, id_turma) DO NOTHING;

INSERT INTO public.nota (id_matricula, descricao_nota, valor_nota)
SELECT m.id_matricula, 'Projeto de pesquisa', 9.00
FROM public.matricula m JOIN public.aluno a ON a.id_aluno = m.id_aluno
WHERE a.email_aluno = 'lia.martins@example.edu.br'
  AND NOT EXISTS (
      SELECT 1 FROM public.nota n
      WHERE n.id_matricula = m.id_matricula AND n.descricao_nota = 'Projeto de pesquisa'
  );
