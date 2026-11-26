// Mensagens do Supabase Auth chegam em inglês. Aqui viram português simples
// para a professora. O que não estiver na lista cai numa mensagem genérica.
const MAPA: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "E-mail ou senha incorretos. Confira e tente de novo."],
  [/email not confirmed/i, "Seu e-mail ainda não foi confirmado. Abra o link que enviamos para sua caixa de entrada."],
  [/user already registered|already been registered/i, "Este e-mail já tem cadastro. Entre com sua senha ou use \"Esqueci minha senha\"."],
  [/password should be at least|password is too short/i, "A senha precisa ter pelo menos 8 caracteres."],
  [/weak password|password is known to be weak|pwned/i, "Essa senha é fácil de adivinhar. Escolha outra, com letras e números."],
  [/new password should be different/i, "A nova senha precisa ser diferente da atual."],
  [/unable to validate email|invalid email|email address .* is invalid/i, "Esse e-mail não parece válido. Confira se digitou certo."],
  [/rate limit|too many requests|security purposes/i, "Muitas tentativas seguidas. Espere um minuto e tente de novo."],
  [/signups? not allowed|signup is disabled/i, "O cadastro está fechado no momento. Fale com o suporte."],
  [/token has expired|otp_expired|link is invalid or has expired|expired/i, "Este link expirou. Peça um novo."],
  [/auth session missing|jwt expired|invalid jwt/i, "Sua sessão terminou. Entre de novo."],
  [/failed to fetch|network|load failed|fetch/i, "Sem conexão com a internet. Confira o sinal e tente de novo."],
];

export function traduzirErroAuth(err: unknown, padrao = "Não foi possível concluir. Tente de novo."): string {
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (!msg) return padrao;
  for (const [re, pt] of MAPA) if (re.test(msg)) return pt;
  // Já está em português (mensagens nossas): mostra como veio.
  if (/[ãõçéêáíóú]/i.test(msg)) return msg;
  return padrao;
}
