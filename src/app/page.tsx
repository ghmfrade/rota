import { AplicacaoFormulario } from "@/formulario/aplicacao-formulario";

// Tela inicial (Spec 04 §3; doc 18 §5): hero full-screen centrado (título +
// descrição) seguido dos cartões de entrada da TASK-052 (TelaInicial). O
// texto do `<h1>` e da descrição é intocável (smoke E2E asserta o heading; a
// frase "Todo o processamento..." é a garantia textual de RN-095/096). Quando
// uma sessão é aberta, `AplicacaoFormulario` passa a montar `LayoutFormulario`
// — casca `fixed inset-0` (TASK-051) que ocupa a viewport independente do
// wrapper aqui, então o hero centralizado não interfere no shell por etapas.
export default function PaginaInicial() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-cinza-50 p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-2xl font-semibold text-cinza-900">
          ROTA — Registro de Operação e Tabelas de Autos
        </h1>
        <p className="mt-2 text-cinza-500">
          Ferramentas de apoio à elaboração e verificação de tabelas operacionais
          de linhas intermunicipais (ARTESP/SUCOL): Formulário e Comparador. Todo
          o processamento ocorre no navegador; nada é salvo no servidor —
          exportar o JSON de operação é o salvar.
        </p>
      </div>
      <AplicacaoFormulario />
    </main>
  );
}
