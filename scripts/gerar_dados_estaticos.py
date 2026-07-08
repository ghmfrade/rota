"""
Gera data/autos_empresas.json e data/municipios.json a partir dos CSVs brutos
(Autos_por_empresa.csv, pop_municipios.csv), conforme Q-005/DEC-030.

Uso: python scripts/gerar_dados_estaticos.py
Reexecutar sempre que os CSVs de origem forem atualizados.
"""
import csv
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"

CARACTERISTICA_TO_TIPO = {
    "Rodoviária Convencional": "Rodoviário",
    "Rodoviária Litorânea": "Rodoviário Litorâneo",
    "Rodoviário Executivo": "Rodoviário",
    "Semiurbana": "Semiurbano",
    "Semiurbana Litorânea": "Semiurbano Litorâneo",
}

TIPOS = [
    {
        "codigo": "Semiurbano",
        "descricao": "Veículo único; todos os Serviços usam código de linha SU.",
    },
    {
        "codigo": "Semiurbano Litorâneo",
        "descricao": "Veículo único; todos os Serviços usam código de linha SUL.",
    },
    {
        "codigo": "Rodoviário",
        "descricao": "Admite mistos por caráter: CR, EX, LE, ME, ML, MX, MM (nunca SU/SUL).",
    },
    {
        "codigo": "Rodoviário Litorâneo",
        "descricao": "Admite mistos por caráter: CL, EX, LE, MEL, MLL, MX, MML (nunca SU/SUL).",
    },
]


def slugify(nome: str) -> str:
    sem_acento = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", sem_acento.lower()).strip("-")
    return slug


def gerar_autos_empresas():
    with open(ROOT / "Autos_por_empresa.csv", encoding="utf-8-sig", newline="") as f:
        linhas = list(csv.DictReader(f, delimiter=";"))

    empresas_por_nome = {}
    autos = []

    for linha in linhas:
        nome_empresa = linha["Permissionaria"].strip()
        empresa_id = slugify(nome_empresa)
        empresas_por_nome.setdefault(empresa_id, nome_empresa)

        caracteristica = linha["caracteristica"].strip()
        tipo = CARACTERISTICA_TO_TIPO[caracteristica]

        autos.append(
            {
                "codigo": linha["Autos"].strip(),
                "tc": linha["TC"].strip(),
                "denominacao_linha": linha["Denominacao_da_linha"].strip(),
                "empresa_id": empresa_id,
                "tipo": tipo,
                "operante": True,
            }
        )

    empresas = [
        {"id": empresa_id, "nome": nome}
        for empresa_id, nome in sorted(empresas_por_nome.items(), key=lambda kv: kv[1])
    ]

    autos.sort(key=lambda a: int(a["codigo"]))

    return {
        "versao_schema": "1.0",
        "tipos": TIPOS,
        "empresas": empresas,
        "autos": autos,
    }


def gerar_municipios():
    with open(ROOT / "pop_municipios.csv", encoding="utf-8-sig", newline="") as f:
        linhas = list(csv.DictReader(f, delimiter=","))

    municipios = [
        {
            "codigo_ibge": linha["cod_municipio"].strip(),
            "nome": linha["nome_municipio"].strip(),
            "populacao_residente": int(linha["populacao_residente"]),
            "estado": linha["estado"].strip(),
        }
        for linha in linhas
    ]
    municipios.sort(key=lambda m: m["nome"])

    return {
        "versao_schema": "1.0",
        "municipios": municipios,
    }


def main():
    DATA_DIR.mkdir(exist_ok=True)

    autos_empresas = gerar_autos_empresas()
    with open(DATA_DIR / "autos_empresas.json", "w", encoding="utf-8") as f:
        json.dump(autos_empresas, f, ensure_ascii=False, indent=2)
        f.write("\n")

    municipios = gerar_municipios()
    with open(DATA_DIR / "municipios.json", "w", encoding="utf-8") as f:
        json.dump(municipios, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"autos: {len(autos_empresas['autos'])}, empresas: {len(autos_empresas['empresas'])}")
    print(f"municipios: {len(municipios['municipios'])}")


if __name__ == "__main__":
    main()
