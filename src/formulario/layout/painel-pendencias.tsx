import type { Pendencia } from "@/formulario/pendencias";
import type { IdEtapa } from "./etapas";

// Painel de pendências (Spec 04 §4/§11): lista viva, colapsável, de erros
// bloqueantes × alertas; cada item é clicável e leva à etapa de origem
// (RN-078). Componente puramente apresentacional — recebe as pendências já
// coletadas (`coletarPendencias`, pendencias/) e um callback de navegação. Não
// guarda estado nem persiste nada (NEG-004): o painel é recomputado a cada
// render a partir da sessão.

interface PropsPainelPendencias {
  pendencias: Pendencia[];
  /** Navega para a etapa de origem da pendência clicada (Spec 04 §11). */
  aoNavegar: (etapa: IdEtapa) => void;
}

export function PainelPendencias({
  pendencias,
  aoNavegar,
}: PropsPainelPendencias) {
  const bloqueantes = pendencias.filter((p) => p.severidade === "bloqueante");
  const alertas = pendencias.filter((p) => p.severidade === "alerta");

  return (
    // `details` dá o comportamento colapsável (Spec 04 §4) de forma acessível,
    // sem estado próprio. Aberto por padrão para dar visibilidade às pendências.
    <details data-testid="painel-pendencias" open>
      <summary>
        Pendências — {bloqueantes.length} bloqueante(s), {alertas.length}{" "}
        alerta(s)
      </summary>

      {pendencias.length === 0 ? (
        <p data-testid="pendencias-vazio">Nenhuma pendência no momento.</p>
      ) : (
        <>
          {bloqueantes.length > 0 && (
            <section aria-label="Erros bloqueantes">
              <h3>Erros bloqueantes</h3>
              <ul>
                {bloqueantes.map((pendencia) => (
                  <li key={pendencia.id}>
                    <ItemPendencia
                      pendencia={pendencia}
                      aoNavegar={aoNavegar}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {alertas.length > 0 && (
            <section aria-label="Alertas">
              <h3>Alertas</h3>
              <ul>
                {alertas.map((pendencia) => (
                  <li key={pendencia.id}>
                    <ItemPendencia
                      pendencia={pendencia}
                      aoNavegar={aoNavegar}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </details>
  );
}

function ItemPendencia({
  pendencia,
  aoNavegar,
}: {
  pendencia: Pendencia;
  aoNavegar: (etapa: IdEtapa) => void;
}) {
  return (
    <button
      type="button"
      data-testid="pendencia-item"
      data-severidade={pendencia.severidade}
      data-etapa-alvo={pendencia.etapaAlvo}
      onClick={() => aoNavegar(pendencia.etapaAlvo)}
    >
      {pendencia.mensagem}
    </button>
  );
}
