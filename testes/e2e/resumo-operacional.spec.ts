import { expect, test } from "@playwright/test";

// E2E do painel "Resumo Operacional" (TASK-031; Spec 04 §10; RN-069/072):
// contagens por Serviço e por Autos, estratificação pelas 7 faixas de
// horário, rótulo obrigatório da semana padrão sem feriados nem operação
// excepcional. Harness próprio
// e transitório (`/resumo-operacional-demo`) — a tela de Revisão completa é
// da TASK-032. Sem OSRM: o Autos do harness já traz rota/viagens fixas.
//
// Números esperados do Autos sintético do harness (ver comentário no page.tsx):
// Serviço 1000-1CR — 2 pares compráveis (AB habilitado + AC ponta-a-ponta já
// habilitado, deduplicado), 3 viagens comuns na Ida (+1 de feriado, ignorada),
// 1 viagem comum na Volta → total 4 viagens, 8 opções (3×2 + 1×2).
// Serviço 1000-2CR — 1 par (só o ponta-a-ponta, matriz vazia), 1 viagem na
// Ida → total 1 viagem, 1 opção.
// Autos: 5 viagens semanais, 9 opções de deslocamento no total.

test("exibe contagens por Serviço, totais do Autos e estratificação por faixa, rotulado semana padrão", async ({
  page,
}) => {
  await page.goto("/resumo-operacional-demo");

  await expect(page.getByTestId("rotulo-semana-padrao")).toContainText(
    "semana padrão (sem feriados nem operação excepcional)",
  );

  const linhas = page.getByTestId("linha-servico");
  await expect(linhas).toHaveCount(2);

  const linhaServico1 = page.getByTestId("tabela-por-servico").locator("tr", { hasText: "1000-1CR" });
  expect(await linhaServico1.locator("td").allTextContents()).toEqual([
    "3",
    "1",
    "4",
    "2",
    "6",
    "2",
    "8",
  ]);

  const linhaServico2 = page.getByTestId("tabela-por-servico").locator("tr", { hasText: "1000-2CR" });
  expect(await linhaServico2.locator("td").allTextContents()).toEqual([
    "1",
    "0",
    "1",
    "1",
    "1",
    "0",
    "1",
  ]);

  await expect(page.getByTestId("total-viagens-semana")).toHaveText("5");
  await expect(page.getByTestId("total-opcoes-deslocamento")).toHaveText("9");

  // 7 faixas fixas da Spec 04 §10, viagem de feriado nunca soma em nenhuma.
  await expect(page.getByTestId("linha-faixa")).toHaveCount(7);
  const somaViagensFaixas = await page.getByTestId("linha-faixa").evaluateAll((linhas) =>
    linhas.reduce((soma, linha) => soma + Number(linha.querySelectorAll("td")[1].textContent), 0),
  );
  expect(somaViagensFaixas).toBe(5);
});
