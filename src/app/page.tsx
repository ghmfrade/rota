import { AplicacaoFormulario } from "@/formulario/aplicacao-formulario";

// Tela inicial (Spec 04 §3): mantém o conteúdo textual e a árvore atuais —
// full-screen com fundo/padding próprios (doc 18 §5) até a restilização com
// cartões de carimbo da TASK-052, que é quem redesenha o miolo desta tela.
export default function PaginaInicial() {
  return (
    <main className="min-h-dvh bg-cinza-50 p-8">
      <h1>ROTA — Registro de Operação e Tabelas de Autos</h1>
      <p>
        Ferramentas de apoio à elaboração e verificação de tabelas operacionais
        de linhas intermunicipais (ARTESP/SUCOL): Formulário e Comparador. Todo
        o processamento ocorre no navegador; nada é salvo no servidor —
        exportar o JSON de operação é o salvar.
      </p>
      <AplicacaoFormulario />
    </main>
  );
}
