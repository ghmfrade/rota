import { expect, test } from "@playwright/test";

// E2E do painel "Descrição textual do itinerário" (TASK-025; Spec 04 §7.4):
// texto gerado automaticamente com Seções em destaque, alternância da lista
// estruturada, cópia do texto e disparo do recálculo. Harness próprio e
// transitório (`/descricao-itinerario-demo`) — a etapa real é da TASK-019
// (DEC-046). Sem OSRM: o harness parte de uma `descricao_itinerario` fixa e
// "Recalcular" só dispara um callback contado (não exercido aqui é o composer
// real, já coberto pelos unitários/integração da própria TASK-025).

test("exibe o texto com Seções destacadas, alterna itens estruturados, copia e recalcula", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/descricao-itinerario-demo");

  const texto = page.getByTestId("descricao-texto");
  await expect(texto).toContainText(
    "Santos - Terminal Central, Rua Treta, Avenida Santo Antônio, São Vicente - Terminal Norte.",
  );

  // Seções em destaque visual (negrito) — vias em texto simples.
  await expect(texto.locator("strong")).toHaveText([
    "Santos - Terminal Central",
    "São Vicente - Terminal Norte",
  ]);

  // Lista estruturada começa oculta.
  await expect(page.getByTestId("descricao-itens")).toHaveCount(0);

  await page.getByRole("button", { name: "Ver itens estruturados" }).click();
  const itens = page.getByTestId("descricao-itens");
  await expect(itens).toBeVisible();
  await expect(itens.locator("li")).toHaveCount(4);

  await page.getByRole("button", { name: "Ocultar itens estruturados" }).click();
  await expect(page.getByTestId("descricao-itens")).toHaveCount(0);

  // "Copiar texto" copia `texto` para a área de transferência (Spec 04 §7.4).
  await page.getByRole("button", { name: "Copiar texto" }).click();
  const copiado = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiado).toBe(
    "Santos - Terminal Central, Rua Treta, Avenida Santo Antônio, São Vicente - Terminal Norte.",
  );

  // Recalcular dispara o callback do host (contador do harness).
  const contador = page.getByTestId("contador-recalculos");
  await expect(contador).toHaveText("0");
  await page.getByRole("button", { name: "Recalcular descrição" }).click();
  await expect(contador).toHaveText("1");
});
