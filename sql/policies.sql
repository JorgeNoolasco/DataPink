-- Execute depois de schema.sql. Acesso vinculado a auth.users.id; e-mail isolado não concede acesso.

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.professor p WHERE p.id_auth = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.professor p WHERE p.id_auth = auth.uid() AND p.tipo_acesso = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_turma(target_turma BIGINT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.turma t JOIN public.professor p USING (id_professor)
    WHERE t.id_turma = target_turma AND p.id_auth = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_aluno(target_aluno BIGINT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.matricula m JOIN public.turma t USING (id_turma)
    JOIN public.professor p USING (id_professor)
    WHERE m.id_aluno = target_aluno AND p.id_auth = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_delete_aluno(target_aluno BIGINT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.is_admin() OR (
    EXISTS (SELECT 1 FROM public.aluno a WHERE a.id_aluno = target_aluno
      AND (a.criado_por = auth.uid() OR public.can_access_aluno(a.id_aluno)))
    AND NOT EXISTS (
      SELECT 1 FROM public.matricula m JOIN public.turma t USING (id_turma)
      JOIN public.professor p USING (id_professor)
      WHERE m.id_aluno = target_aluno AND p.id_auth IS DISTINCT FROM auth.uid()
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_matricula(target_matricula BIGINT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.matricula m JOIN public.turma t USING (id_turma)
    JOIN public.professor p USING (id_professor)
    WHERE m.id_matricula = target_matricula AND p.id_auth = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_turma(BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_aluno(BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_delete_aluno(BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_matricula(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff(), public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_turma(BIGINT), public.can_access_aluno(BIGINT), public.can_delete_aluno(BIGINT), public.can_access_matricula(BIGINT) TO authenticated;

ALTER TABLE public.professor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aluno ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nota ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.professor FORCE ROW LEVEL SECURITY;
ALTER TABLE public.curso FORCE ROW LEVEL SECURITY;
ALTER TABLE public.turma FORCE ROW LEVEL SECURITY;
ALTER TABLE public.aluno FORCE ROW LEVEL SECURITY;
ALTER TABLE public.matricula FORCE ROW LEVEL SECURITY;
ALTER TABLE public.nota FORCE ROW LEVEL SECURITY;

CREATE POLICY professor_ler_proprio ON public.professor FOR SELECT TO authenticated
  USING (id_auth = (SELECT auth.uid()) OR (SELECT public.is_admin()));
CREATE POLICY professor_admin_editar ON public.professor FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY professor_admin_excluir ON public.professor FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY curso_ler_acessivel ON public.curso FOR SELECT TO authenticated
  USING ((SELECT public.is_staff()));
CREATE POLICY curso_admin_inserir ON public.curso FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY curso_admin_editar ON public.curso FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY curso_admin_excluir ON public.curso FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY turma_ler_propria ON public.turma FOR SELECT TO authenticated
  USING (public.can_access_turma(id_turma));
CREATE POLICY turma_inserir_autorizada ON public.turma FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()) OR EXISTS (
    SELECT 1 FROM public.professor p WHERE p.id_professor = turma.id_professor AND p.id_auth = (SELECT auth.uid())
  ));
CREATE POLICY turma_editar_propria ON public.turma FOR UPDATE TO authenticated
  USING (public.can_access_turma(id_turma)) WITH CHECK (
    public.can_access_turma(id_turma) AND ((SELECT public.is_admin()) OR EXISTS (
      SELECT 1 FROM public.professor p WHERE p.id_professor = turma.id_professor AND p.id_auth = (SELECT auth.uid())
    ))
  );
CREATE POLICY turma_excluir_propria ON public.turma FOR DELETE TO authenticated
  USING (public.can_access_turma(id_turma));

CREATE POLICY aluno_ler_autorizado ON public.aluno FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()) OR criado_por = (SELECT auth.uid()) OR public.can_access_aluno(id_aluno));
CREATE POLICY aluno_inserir_autorizado ON public.aluno FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_staff()) AND criado_por = (SELECT auth.uid()));
CREATE POLICY aluno_editar_autorizado ON public.aluno FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()) OR criado_por = (SELECT auth.uid()) OR public.can_access_aluno(id_aluno))
  WITH CHECK ((SELECT public.is_admin()) OR criado_por = (SELECT auth.uid()) OR public.can_access_aluno(id_aluno));
CREATE POLICY aluno_excluir_autorizado ON public.aluno FOR DELETE TO authenticated
  USING (public.can_delete_aluno(id_aluno));

CREATE POLICY matricula_ler_autorizada ON public.matricula FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()) OR public.can_access_turma(id_turma) OR EXISTS (
    SELECT 1 FROM public.aluno a WHERE a.id_aluno = matricula.id_aluno AND a.criado_por = (SELECT auth.uid())
  ));
CREATE POLICY matricula_inserir_autorizada ON public.matricula FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()) OR (public.can_access_turma(id_turma) AND EXISTS (
    SELECT 1 FROM public.aluno a WHERE a.id_aluno = matricula.id_aluno
      AND (a.criado_por = (SELECT auth.uid()) OR public.can_access_aluno(a.id_aluno))
  )));
CREATE POLICY matricula_editar_autorizada ON public.matricula FOR UPDATE TO authenticated
  USING (public.can_access_turma(id_turma)) WITH CHECK (public.can_access_turma(id_turma));
CREATE POLICY matricula_excluir_autorizada ON public.matricula FOR DELETE TO authenticated
  USING (public.can_access_turma(id_turma));

CREATE POLICY nota_ler_autorizada ON public.nota FOR SELECT TO authenticated
  USING (public.can_access_matricula(id_matricula));
CREATE POLICY nota_inserir_autorizada ON public.nota FOR INSERT TO authenticated
  WITH CHECK (public.can_access_matricula(id_matricula));
CREATE POLICY nota_editar_autorizada ON public.nota FOR UPDATE TO authenticated
  USING (public.can_access_matricula(id_matricula)) WITH CHECK (public.can_access_matricula(id_matricula));
CREATE POLICY nota_excluir_autorizada ON public.nota FOR DELETE TO authenticated
  USING (public.can_access_matricula(id_matricula));

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.professor TO authenticated;
GRANT UPDATE, DELETE ON public.professor TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curso, public.turma, public.aluno, public.matricula, public.nota TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
