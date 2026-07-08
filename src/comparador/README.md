# comparador/

Comparador: lê dois JSONs de operação congelados (vigente × proposta), casa entidades por UUID, exibe o diff e gera o PDF comparativo (Spec 05). Somente-leitura: nunca chama OSRM, nunca escreve. Depende apenas de `shared/`; nunca importa de `formulario/` (RN-097).
