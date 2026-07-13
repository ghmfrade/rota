import { expect, test } from "@playwright/test";

// E2E do editor de Seções (TASK-017; Spec 04 §7.1/§7.3): arrasto que viola os
// 350 m é recusado — o ponto NÃO se move e a mensagem literal da Spec 04 §14
// aparece, nomeando a Seção afetada. Sem oferta automática de "criar Seção
// nova" na recusa (DEC-044/Q-025): arrastar não pode descaracterizar a Seção;
// o usuário usa o fluxo normal de clique se quiser uma Seção separada.
//
// Harness próprio e transitório (`/editor-secoes-demo`) — a etapa real é da
// TASK-019 (Q-024/DEC-043). Tiles interceptados: nenhum teste depende da rede
// de tiles (mesma disciplina do mock do OSRM, docs-dev/08); esta task não usa
// OSRM (o disparo de recálculo é só um callback opcional, não exercido aqui).

const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=",
  "base64",
);

test("arrasto além de 350 m é recusado, sem oferta automática de Seção nova (Spec 04 §14)", async ({
  page,
}) => {
  await page.route("https://tile.openstreetmap.org/**", (rota) =>
    rota.fulfill({ contentType: "image/png", body: PNG_1x1 }),
  );

  await page.goto("/editor-secoes-demo");

  const mapa = page.getByTestId("mapa-base");
  await expect(mapa).toBeVisible();

  const marcador = mapa.locator(".maplibregl-marker");
  await expect(marcador).toBeVisible();

  const jsonAntes = await page.getByTestId("secoes-json").textContent();

  const caixaAntes = await marcador.boundingBox();
  if (!caixaAntes) throw new Error("marcador sem bounding box");
  const origemX = caixaAntes.x + caixaAntes.width / 2;
  const origemY = caixaAntes.y + caixaAntes.height / 2;

  // No zoom default (Estado inteiro), 120 px equivalem a muitos km — bem
  // acima dos 350 m, independentemente da direção do arrasto.
  await page.mouse.move(origemX, origemY);
  await page.mouse.down();
  await page.mouse.move(origemX + 120, origemY, { steps: 10 });
  await page.mouse.up();

  const mensagem = page.getByTestId("mensagem-recusa-secao");
  await expect(mensagem).toContainText(
    "Este ponto fica a mais de 350 m do conjunto de pontos desta Seção. Crie uma Seção separada (com outro nome) para este local.",
  );
  await expect(mensagem).toContainText("Cidade Demo - Terminal Demo");

  // Nenhuma oferta automática de criar Seção nova — só a mensagem.
  await expect(page.getByTestId("form-criar-secao")).toHaveCount(0);

  // Ponto NÃO se moveu: o JSON de Seções fica idêntico ao de antes do arrasto.
  const jsonDepois = await page.getByTestId("secoes-json").textContent();
  expect(jsonDepois).toBe(jsonAntes);
});
