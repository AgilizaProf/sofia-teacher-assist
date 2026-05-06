// Componente de cabeçalho único e reutilizável de todo o projeto.
// Mantém a identidade visual já aprovada (AppHeader) e centraliza o ponto
// de importação para evitar divergências de layout entre as abas.
export { AppHeader as Header, appHeaderCss } from "@/components/layout/AppHeader";
export type { AppHeaderProps as HeaderProps } from "@/components/layout/AppHeader";