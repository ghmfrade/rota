// Abreviação do nome de via para a sugestão de nome de Seção/Local (TASK-130;
// Q-090/DEC-112). Função pura, sem UI e sem rede: transforma o nome cru
// entregue pelo OSRM `/nearest` (TASK-131) no rótulo curto oferecido como
// sugestão editável na linha-formulário de criação (TASK-133). O limite é
// alvo da sugestão, nunca regra de contrato — `nome` do documento continua
// livre (RN-096, DEC-112 §4).

/** Alvo de comprimento da sugestão de nome (DEC-112 §4). */
export const LIMITE_PADRAO_NOME_SUGERIDO = 25;

/** Nenhuma abreviação desce abaixo disto, salvo na etapa de exceção (DEC-112 §4). */
const COMPRIMENTO_MINIMO_ABREVIACAO = 5;

/** Tabela fechada de siglas de tipo de logradouro (TASK-130) — não ampliar sem nova task. */
const TIPOS_DE_LOGRADOURO: Record<string, string> = {
  rua: "R.",
  avenida: "Av.",
  rodovia: "Rod.",
  estrada: "Estr.",
  praca: "Pç.",
  alameda: "Al.",
  travessa: "Tv.",
  largo: "Lgo.",
  marginal: "Marg.",
  viaduto: "Vd.",
  via: "Via",
};

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function caracteres(texto: string): string[] {
  return Array.from(texto.normalize("NFC"));
}

function comprimento(texto: string): number {
  return caracteres(texto).length;
}

function normalizarEntrada(nome: string | undefined): string {
  if (!nome) return "";
  const semBordas = nome
    .trim()
    .replace(/^[.,;:\-]+|[.,;:\-]+$/g, "")
    .trim();
  return semBordas.replace(/\s+/g, " ");
}

function aplicarSigla(palavras: string[]): string[] {
  if (palavras.length === 0) return palavras;
  const [primeira, ...resto] = palavras;
  const chave = semAcento(primeira).toLowerCase();
  const sigla = TIPOS_DE_LOGRADOURO[chave];
  return sigla ? [sigla, ...resto] : palavras;
}

function abreviarPalavra(palavra: string, l: number): string {
  const chars = caracteres(palavra);
  if (chars.length < l + 2) return palavra;
  return `${chars.slice(0, l).join("")}.`;
}

function montar(palavras: string[]): string {
  return palavras.join(" ");
}

/**
 * Abrevia o nome cru de uma via para o alvo de `limite` caracteres, na
 * estratégia ditada pela DEC-112 §4: sigla do tipo de logradouro, depois
 * corte igualitário com o maior `L >= 5` que faça caber, depois redução
 * abaixo de 5 só na 1ª e na 2ª palavra do corpo, depois truncamento.
 */
export function abreviarNomeDeVia(
  nome: string | undefined,
  limite: number = LIMITE_PADRAO_NOME_SUGERIDO
): string {
  const normalizado = normalizarEntrada(nome);
  if (!normalizado) return "";

  const comSigla = aplicarSigla(normalizado.split(" "));
  if (comprimento(montar(comSigla)) <= limite) {
    return montar(comSigla);
  }

  const [primeiraPalavra, ...corpo] = comSigla;

  const maiorPalavra = Math.max(0, ...corpo.map((palavra) => comprimento(palavra)));
  for (let l = maiorPalavra - 2; l >= COMPRIMENTO_MINIMO_ABREVIACAO; l--) {
    const candidato = corpo.map((palavra) => abreviarPalavra(palavra, l));
    if (comprimento(montar([primeiraPalavra, ...candidato])) <= limite) {
      return montar([primeiraPalavra, ...candidato]);
    }
  }

  const corpoReduzido = corpo.map((palavra) =>
    abreviarPalavra(palavra, COMPRIMENTO_MINIMO_ABREVIACAO)
  );
  for (let indiceExcecao = 0; indiceExcecao < Math.min(2, corpo.length); indiceExcecao++) {
    for (let l = 4; l >= 1; l--) {
      const candidatoPalavra = abreviarPalavra(corpo[indiceExcecao], l);
      const candidato = [...corpoReduzido];
      candidato[indiceExcecao] = candidatoPalavra;
      const resultado = montar([primeiraPalavra, ...candidato]);
      if (comprimento(resultado) <= limite) {
        return resultado;
      }
      corpoReduzido[indiceExcecao] = candidatoPalavra;
    }
  }

  const exaurido = montar([primeiraPalavra, ...corpoReduzido]);
  const truncado = caracteres(exaurido).slice(0, limite).join("");
  return truncado.replace(/[\s.]+$/g, "");
}
