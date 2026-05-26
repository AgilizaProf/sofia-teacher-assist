// Substituído: autenticação Google agora usa OAuth nativo do Supabase
export const lovable = {
  auth: {
    signInWithOAuth: async () => {
      throw new Error("Use supabase.auth.signInWithOAuth diretamente.");
    },
  },
};
