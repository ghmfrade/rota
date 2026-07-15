// Conversões de horário de relógio (Spec 04 §8.1/§8.2; RN-067): a grade
// recebe "HH:MM" digitado pelo usuário (input nativo type="time") e o
// Formulário converte para o "HH:MM:SS" do contrato (Spec 02 §11) — o offset
// nunca é digitado diretamente, só o horário absoluto.

const REGEX_HORA_MINUTO = /^([01]\d|2[0-3]):[0-5]\d$/;

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
 * Converte "HH:MM" (input `type="time"` da grade) em "HH:MM:SS" — segundos
 * sempre "00" quando digitados pela grade (Spec 04 §8.1). `null` se
 * malformado — a grade não inventa horário a partir de entrada inválida.
 */
export function horaMinutoParaHorarioRelogio(horaMinuto: string): string | null {
  if (!REGEX_HORA_MINUTO.test(horaMinuto)) return null;
  return `${horaMinuto}:00`;
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
