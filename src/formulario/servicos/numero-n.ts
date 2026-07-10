import {
  CARACTERISTICAS_DE_VEICULO,
  type Servico,
} from "@/shared/contrato";
import type { CaracteristicaDeVeiculo } from "@/shared/tipificacao";

// Composição e manutenção do `numero_n` de Serviço (RN-006; DEC-037; Spec 02 §6;
// Spec 03 §10.3 regra 5). Puro, sem UI nem estado.
//
// `numero_n` é rótulo de DISPLAY, formato `"<codigo>-<sequencial><caracteristica>"`
// (ex.: `"1000-1CR"`) — nunca identidade (a identidade é a `uuid`, RN-006). O
// sufixo embute a `caracteristica_veiculo`; por DEC-037 ele é **regenerado**
// quando a característica muda (edição direta na etapa Serviços ou reconversão na
// troca de tipo — RN-023), preservando o número sequencial. O sequencial é
// sugerido por ordem de cadastro (Spec 03 §10.3 regra 5) e permanece editável.

// Códigos de característica ordenados do mais longo para o mais curto: ao remover
// o sufixo por comparação de fim de string, `"SUL"` deve ser testado antes de
// `"SU"`, `"MML"` antes de `"MM"`/`"ML"`, etc. — senão um código curto casaria
// dentro de um longo e truncaria errado.
const CODIGOS_POR_TAMANHO: readonly CaracteristicaDeVeiculo[] = [
  ...CARACTERISTICAS_DE_VEICULO,
].sort((a, b) => b.length - a.length);

/**
 * Remove do fim de `numeroN` um sufixo de característica conhecido, se houver.
 * `"1000-1CR"` → `"1000-1"`; `"1000-3SUL"` → `"1000-3"`; um rótulo sem sufixo
 * conhecido volta inalterado. Base de `regenerarSufixoNumeroN` e da leitura do
 * sequencial.
 */
function removerSufixoCaracteristica(numeroN: string): string {
  for (const codigo of CODIGOS_POR_TAMANHO) {
    if (numeroN.endsWith(codigo)) {
      return numeroN.slice(0, numeroN.length - codigo.length);
    }
  }
  return numeroN;
}

/**
 * Regenera o sufixo de característica de um `numero_n`, preservando tudo à
 * esquerda (código + sequencial). `("1000-2ME", "CL")` → `"1000-2CL"` (DEC-037).
 * Se o rótulo não terminava num código conhecido (rótulo livre/importado fora da
 * convenção), apenas anexa a nova característica — nunca lança, pois `numero_n`
 * é só display (RN-006).
 */
export function regenerarSufixoNumeroN(
  numeroN: string,
  novaCaracteristica: CaracteristicaDeVeiculo,
): string {
  return `${removerSufixoCaracteristica(numeroN)}${novaCaracteristica}`;
}

/**
 * Extrai o número sequencial de um `numero_n` (`"1000-3CR"` → `3`); `null` se o
 * trecho antes do sufixo de característica não terminar em dígitos.
 */
function extrairSequencial(numeroN: string): number | null {
  const base = removerSufixoCaracteristica(numeroN);
  const casamento = base.match(/(\d+)$/);
  return casamento ? Number.parseInt(casamento[1], 10) : null;
}

/**
 * Sugere o próximo `numero_n` por ordem de cadastro (Spec 03 §10.3 regra 5):
 * `"<codigo>-<maior sequencial existente + 1><caracteristica>"`. Lista vazia →
 * sequencial 1. É só sugestão — o usuário pode sobrescrever (RN-006).
 */
export function sugerirNumeroN(
  codigo: string,
  numerosExistentes: readonly string[],
  caracteristica: CaracteristicaDeVeiculo,
): string {
  const maiorSequencial = numerosExistentes.reduce((maior, numeroN) => {
    const sequencial = extrairSequencial(numeroN);
    return sequencial !== null && sequencial > maior ? sequencial : maior;
  }, 0);
  return `${codigo}-${maiorSequencial + 1}${caracteristica}`;
}

/**
 * `numero_n` de um Serviço reescrito para a nova característica (DEC-037):
 * atalho de `regenerarSufixoNumeroN` sobre o campo do Serviço, usado na edição
 * direta e na reconversão.
 */
export function numeroNComCaracteristica(
  servico: Pick<Servico, "numero_n">,
  novaCaracteristica: CaracteristicaDeVeiculo,
): string {
  return regenerarSufixoNumeroN(servico.numero_n, novaCaracteristica);
}
