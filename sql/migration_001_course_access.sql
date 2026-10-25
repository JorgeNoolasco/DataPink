-- Permite que docentes autorizados listem cursos para criar turmas.
-- Pode ser executado novamente com seguranca.
DROP POLICY IF EXISTS curso_ler_acessivel ON public.curso;
CREATE POLICY curso_ler_acessivel ON public.curso FOR SELECT TO authenticated
  USING ((SELECT public.is_staff()));
