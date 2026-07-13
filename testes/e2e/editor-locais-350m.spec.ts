import { expect, test } from "@playwright/test";

// E2E do editor de Locais (TASK-018; Spec 04 §7.2/§7.3): arrasto que viola os
// 350 m PAREADOS (Ida×Volta do mesmo Local — RN-032) é recusado — o ponto NÃO se
// move e a mensagem literal da Spec 04 §14 aparece, nomeando o Local afetado.
// Sem oferta automática de "criar Local novo" na recusa (DEC-044/Q-025,
// simétrico à Seção): arrastar não pode descaracterizar o Local; o usuário usa o
// fluxo normal de clique se quiser dois Locais distintos.
//
// Harness próprio e transitório (`/editor-locais-demo`) — a etapa real é da
// TASK-019 (DEC-045). Tiles interceptados: nenhum teste depende da rede de tiles
// (mesma disciplina do mock do OSRM, docs-dev/08); esta task não usa OSRM (o
// disparo de recálculo é só um callback opcional, não exercido aqui).

const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=",
  "base64",
);

test("arrasto além de 350 m do par é recusado, sem oferta automática de Local novo (Spec 04 §14)", async ({
  page,
}) => {
  await page.route("https://tile.openstreetmap.org/**", (rota) =>
    rota.fulfill({ contentType: "image/png", body: PNG_1x1 }),
  );

  await page.goto("/editor-locais-demo");

  const mapa = page.getByTestId("mapa-base");
  await expect(mapa).toBeVisible();

  const marcador = mapa.locator(".maplibregl-marker");
  await expect(marcador).toBeVisible();

  const jsonAntes = await page.getByTestId("locais-json").textContent();

  const caixaAntes = await marcador.boundingBox();
  if (!caixaAntes) throw new Error("marcador sem bounding box");
  const origemX = caixaAntes.x + caixaAntes.width / 2;
  const origemY = caixaAntes.y + caixaAntes.height / 2;

  // No zoom default (Estado inteiro), 120 px equivalem a muitos km — bem acima
  // dos 350 m, afastando a Ida da Volta (que fica no centro).
  await page.mouse.move(origemX, origemY);
  await page.mouse.down();
  await page.mouse.move(origemX + 120, origemY, { steps: 10 });
  await page.mouse.up();

  const mensagem = page.getByTestId("mensagem-recusa-local");
  await expect(mensagem).toContainText(
    "Os pontos de Ida e Volta deste Local não podem distar mais de 350 m entre si. Crie dois Locais distintos se necessário.",
  );
  await expect(mensagem).toContainText("Cidade Demo - Ponto Demo");

  // Nenhuma oferta automática de criar Local novo — só a mensagem.
  await expect(page.getByTestId("form-criar-local")).toHaveCount(0);

  // Ponto NÃO se moveu: o JSON de Locais fica idêntico ao de antes do arrasto.
  const jsonDepois = await page.getByTestId("locais-json").textContent();
  expect(jsonDepois).toBe(jsonAntes);
});
