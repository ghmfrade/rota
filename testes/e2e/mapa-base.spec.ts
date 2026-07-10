import { expect, test } from "@playwright/test";

// Smoke E2E do mapa base (TASK-020): o componente monta com WebGL, renderiza o
// canvas do MapLibre e a captura de imagem devolve um data-URI (RN-074).
//
// Os tiles são interceptados e servidos com um PNG local — nenhum teste depende
// da rede de tiles (mesma disciplina do mock do OSRM, docs-dev/08).

// PNG 1×1 RGBA transparente (válido, decodável pelo MapLibre).
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=",
  "base64",
);

test("mapa base monta, renderiza canvas e captura imagem (RN-074)", async ({
  page,
}) => {
  await page.route("https://tile.openstreetmap.org/**", (rota) =>
    rota.fulfill({ contentType: "image/png", body: PNG_1x1 }),
  );

  await page.goto("/mapa-demo");

  // O container do mapa e o canvas do MapLibre existem.
  const container = page.getByTestId("mapa-base");
  await expect(container).toBeVisible();
  await expect(container.locator("canvas.maplibregl-canvas")).toBeVisible();

  // A captura do canvas devolve um data-URI de imagem (RN-074).
  await page.getByTestId("capturar-imagem").click();
  await expect(page.getByTestId("imagem-capturada")).toHaveText(
    /^data:image\/png;base64,/,
  );
});
