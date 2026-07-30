// Conversões de horário de relógio (Spec 04 §8.1/§8.2; RN-067): a grade
// recebe horário digitado pelo usuário num campo textual (com ou sem ":") e o
// Formulário converte para o "HH:MM:SS" do contrato (Spec 02 §11) — o offset
// nunca é digitado diretamente, só o horário absoluto.

const REGEX_HORA_MINUTO = /^([01]\d|2[0-3]):[0-5]\d$/;
const REGEX_HORA_MINUTO_COM_SEPARADOR = /^(\d{1,2}):(\d{2})$/;
const REGEX_HORA_MINUTO_SEM_SEPARADOR = /^(\d{1,2})(\d{2})$/;

/**
 * Máscara efêmera para campos temporais de apoio (DEC-093). Mantém no máximo
 * quatro algarismos e apenas apresenta-os como HH:MM: não valida nem corrige
 * horas/minutos impossíveis.
 */
export function mascararRascunhoHoraMinuto(rascunho: string): string {
  const algarismos = rascunho.replace(/\D/g, "").slice(0, 4);
  if (algarismos.length === 0) return "";
  const preenchido = algarismos.padStart(4, "0");
  return `${preenchido.slice(0, 2)}:${preenchido.slice(2)}`;
}

/**
 * Atualiza o rascunho numérico de uma máscara já exibida. Ao digitar no fim de
 * "00:01", por exemplo, o novo algarismo substitui o zero de preenchimento,
 * permitindo a sequência 1 → 00:01, 12 → 00:12 e 123 → 01:23.
 */
export function atualizarRascunhoHoraMinuto(rascunhoAtual: string, entrada: string): string {
  const atual = rascunhoAtual.replace(/\D/g, "").slice(0, 4);
  const exibicaoAtual = mascararRascunhoHoraMinuto(atual);

  if (entrada.startsWith(exibicaoAtual)) {
    const acrescentado = entrada.slice(exibicaoAtual.length).replace(/\D/g, "");
    return `${atual}${acrescentado}`.slice(0, 4);
  }

  if (exibicaoAtual.startsWith(entrada)) {
    const quantidadeRemovida = exibicaoAtual.length - entrada.length;
    return atual.slice(0, Math.max(0, atual.length - quantidadeRemovida));
  }

  return entrada.replace(/\D/g, "").slice(0, 4);
}

/** Converte "HH:MM:SS" (horário de relógio ou offset) em total de segundos. */
export function horarioParaSegundos(horarioHms: string): number {
  const [horas, minutos, segundos] = horarioHms.split(":").map(Number);
  return horas * 3600 + minutos * 60 + segundos;
}

function pad(numero: number): string {
  return String(numero).padStart(2, "0");
}

/** Formata segundos acumulados em `HH:MM:SS` (Spec 03 §8.1 `formata_hms`). */
export function formatarHms(totalSegundos: number): string {
  const segundosInteiros = Math.round(totalSegundos);
  const horas = Math.floor(segundosInteiros / 3600);
  const minutos = Math.floor((segundosInteiros % 3600) / 60);
  const segundos = segundosInteiros % 60;
  return `${pad(horas)}:${pad(minutos)}:${pad(segundos)}`;
}

/**
 * Normaliza a digitação rápida da grade para `HH:MM`: o separador é opcional,
 * portanto `830`, `0830`, `8:30` e `08:30` representam o mesmo horário. A
 * validação continua restrita ao relógio 00:00–23:59 (RN-067).
 */
export function normalizarEntradaHoraMinuto(entrada: string): string | null {
  const texto = entrada.trim();
  const partes =
    REGEX_HORA_MINUTO_COM_SEPARADOR.exec(texto) ??
    REGEX_HORA_MINUTO_SEM_SEPARADOR.exec(texto);
  if (!partes) return null;

  const horas = Number(partes[1]);
  const minutos = Number(partes[2]);
  if (horas > 23 || minutos > 59) return null;
  return `${pad(horas)}:${pad(minutos)}`;
}

/**
 * Converte a entrada textual da grade em "HH:MM:SS" — segundos sempre "00"
 * quando digitados pela grade (Spec 04 §8.1). `null` se malformado.
 */
export function horaMinutoParaHorarioRelogio(horaMinuto: string): string | null {
  const normalizado = normalizarEntradaHoraMinuto(horaMinuto);
  if (normalizado === null || !REGEX_HORA_MINUTO.test(normalizado)) return null;
  return `${normalizado}:00`;
}

/** Converte "HH:MM:SS" gravado no contrato em "HH:MM" para exibição na grade (Spec 04 §8.1). */
export function horarioParaHoraMinuto(horarioHms: string): string {
  return horarioHms.slice(0, 5);
}

/**
 * Horário absoluto de passagem = `horario_saida + offset_horario`, módulo 24 h
 * (RN-067; Spec 04 §2.4/§2.5/§8.2 — a grade exibe horário de relógio, nunca
 * offset cru).
 */
export function somarHorarios(horarioSaida: string, offset: string): string {
  const totalSegundos = (horarioParaSegundos(horarioSaida) + horarioParaSegundos(offset)) % 86400;
  return formatarHms(totalSegundos);
}
