# shared/

Base comum das ferramentas: schema do contrato JSON de operação (Spec 02), validadores, primitivas geoespaciais e módulo de contagens. Não depende de `formulario/` nem de `comparador/` (RN-097; `docs-dev/13-ARCHITECTURE_GUARDRAILS.md`).

- `contrato/` — schema do JSON de operação (Spec 02).
- `dados-estaticos/` — schemas e carregadores dos recursos estáticos servidos junto do app (Spec 01 §8; DEC-030): listas de Autos/empresas/tipos (`data/autos_empresas.json`), base de municípios (`data/municipios.json`) e geometrias municipais (`public/dados/municipios_sp.geojson`).
