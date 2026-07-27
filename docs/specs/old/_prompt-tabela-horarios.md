Agora iniciaremos uma revisão no UX dos horários.

Constatamos que existe uma ausência da possibilidade de inserção de tabelas horárias especificas em meses excepcionais.
Acredito que isto não está previsto nas specs.
Precisaremos de alterar a estrutura do JSON, já que a informação de determinados meses deverá estár inserida.
Hoje, existe na estrutura os horarios normais, que nao sao classificados como feriado, e os horarios de feriado, sendo uma estrutura booleana.
Temos duas alternativas, criar um novo atributo viagens e nao alterar essa estrutura, sendo essa nova estrutura com essa nova tabela, o que parece uma gambiarra, mas se for pragmaticamente mais facil pode ter vantagens.
Ou, pode alterar a estrutura booleana para ser, padrao, feriado, [array de meses].
E inserir na UX, uma opção do usuario inserir uma tabela para periodos excepcionais (com nome, por exempo ferias de verao). Em que o usuario coloca os meses que essa tabela seria vigente, e essa informacao entre nesse atributo.
