-- Função que reordena as semanas de uma trilha de forma atômica.
-- Recebe o ID da trilha e um array ordenado de UUIDs das semanas.
-- Tudo acontece dentro de uma única transação no banco — ou tudo funciona, ou nada muda.

create or replace function public.reordenar_semanas_trilha(
  _trilha_id uuid,
  _ordem uuid[]      -- array de IDs na ordem desejada: [semana_que_vira_S1, semana_que_vira_S2, ...]
)
returns void
language plpgsql
security definer    -- executa com privilégio do dono da função (bypassa RLS internamente)
as $$
begin
  -- Etapa 1: move TODOS para faixa alta temporária (ex: 10001, 10002...)
  -- Isso evita qualquer conflito com a constraint UNIQUE durante a transição.
  update public.trilha_semanas
  set semana = semana + 10000
  where trilha_id = _trilha_id;

  -- Etapa 2: aplica a ordem final.
  -- array_length retorna o tamanho do array, e _ordem[i] é o UUID da semana na posição i.
  for i in 1 .. array_length(_ordem, 1) loop
    update public.trilha_semanas
    set semana = i
    where id = _ordem[i]
      and trilha_id = _trilha_id;   -- proteção extra: só atualiza se for da trilha certa
  end loop;
end;
$$;

-- Garante que apenas usuários autenticados podem chamar esta função
revoke all on function public.reordenar_semanas_trilha(uuid, uuid[]) from public;
grant execute on function public.reordenar_semanas_trilha(uuid, uuid[]) to authenticated;
