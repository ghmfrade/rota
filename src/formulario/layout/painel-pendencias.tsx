import { Selo } from "@/shared/ui";
import type { Pendencia } from "@/formulario/pendencias";
import type { IdEtapa } from "./etapas";

// Painel de pendências (Spec 04 §4/§11; doc 18 §5): lista viva, colapsável, de
// erros bloqueantes × alertas; cada item é clicável e leva à etapa de origem
// (RN-078). Componente puramente apresentacional — recebe as pendências já
// coletadas (`coletarPendencias`, pendencias/) e um callback de navegação. Não
// guarda estado nem persiste nada (NEG-004): o painel é recomputado a cada
// render a partir da sessão.
//
// Renderizado no fluxo do conteúdo (`layout-formulario.tsx`), como cartão
// elevado (doc 18 §5): nunca sobreposto a elementos interativos — um overlay
// `absolute` aberto por padrão interceptaria os cliques do formulário
// (comportamento prevalece sobre aparência, doc 18 §1.2).

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
    <details
      data-testid="painel-pendencias"
      open
      className={
        "overflow-hidden rounded-painel border border-cinza-200 bg-white " +
        "shadow-sombra-1 open:shadow-sombra-2 " +
        "[transition:box-shadow_var(--transicao-media)]"
      }
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-cinza-900">
        Pendências
        <Selo tom={bloqueantes.length > 0 ? "erro" : "neutro"}>
          {bloqueantes.length} bloqueante(s)
        </Selo>
        <Selo tom={alertas.length > 0 ? "alerta" : "neutro"}>
          {alertas.length} alerta(s)
        </Selo>
      </summary>

      <div className="max-h-96 overflow-y-auto border-t border-cinza-200 px-4 py-3">
        {pendencias.length === 0 ? (
          <p data-testid="pendencias-vazio" className="text-sm text-cinza-500">
            Nenhuma pendência no momento.
          </p>
        ) : (
          <>
            {bloqueantes.length > 0 && (
              <SecaoPendencia
                ariaLabel="Erros bloqueantes"
                titulo="Erros bloqueantes"
                corTitulo="text-erro"
                itens={bloqueantes}
                aoNavegar={aoNavegar}
              />
            )}

            {alertas.length > 0 && (
              <SecaoPendencia
                ariaLabel="Alertas"
                titulo="Alertas"
                corTitulo="text-alerta"
                itens={alertas}
                aoNavegar={aoNavegar}
                className="mt-3"
              />
            )}
          </>
        )}
      </div>
    </details>
  );
}

// Um grupo de pendências (bloqueantes ou alertas) — mesma forma (título +
// lista), diferindo só no rótulo, na cor do título e na origem dos itens.
function SecaoPendencia({
  ariaLabel,
  titulo,
  corTitulo,
  itens,
  aoNavegar,
  className,
}: {
  ariaLabel: string;
  titulo: string;
  corTitulo: string;
  itens: Pendencia[];
  aoNavegar: (etapa: IdEtapa) => void;
  className?: string;
}) {
  return (
    <section aria-label={ariaLabel} className={className}>
      <h3 className={"text-xs font-semibold uppercase " + corTitulo}>{titulo}</h3>
      <ul className="mt-1 space-y-1">
        {itens.map((pendencia) => (
          <li key={pendencia.id}>
            <ItemPendencia pendencia={pendencia} aoNavegar={aoNavegar} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ItemPendencia({
  pendencia,
  aoNavegar,
}: {
  pendencia: Pendencia;
  aoNavegar: (etapa: IdEtapa) => void;
}) {
  const cor = pendencia.severidade === "bloqueante" ? "text-erro" : "text-alerta";
  return (
    <button
      type="button"
      data-testid="pendencia-item"
      data-severidade={pendencia.severidade}
      data-etapa-alvo={pendencia.etapaAlvo}
      onClick={() => aoNavegar(pendencia.etapaAlvo)}
      className={
        "block w-full rounded-controle px-2 py-1 text-left text-sm hover:bg-cinza-100 " +
        cor
      }
    >
      {pendencia.mensagem}
    </button>
  );
}
