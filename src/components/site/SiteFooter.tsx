/**
 * Rodapé global do dashboard: apenas créditos e contacto.
 */
export function SiteFooter() {
  return (
    <footer className="bg-white px-4 pb-4 pt-1 text-center text-xs text-zinc-500 md:px-6">
      <p>
        © {new Date().getFullYear()} Comunidade Rafa Portugal. Todos os direitos reservados. ·{' '}
        rafaapelomundo@gmail.com
      </p>
    </footer>
  );
}
