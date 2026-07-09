import { TelaInicial } from "@/formulario/tela-inicial";

export default function PaginaInicial() {
  return (
    <main>
      <h1>ROTA — Registro de Operação e Tabelas de Autos</h1>
      <p>
        Ferramentas de apoio à elaboração e verificação de tabelas operacionais
        de linhas intermunicipais (ARTESP/SUCOL): Formulário e Comparador. Todo
        o processamento ocorre no navegador; nada é salvo no servidor —
        exportar o JSON de operação é o salvar.
      </p>
      <TelaInicial />
    </main>
  );
}
