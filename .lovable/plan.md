# Atualização do sistema: Patrimônio unificado, Parcelamentos, Auditoria/Lixeira e Relatório PDF

São quatro frentes grandes. Proposta de execução em 4 etapas, na ordem abaixo, para nunca deixar o sistema quebrado no meio do caminho. Nada do que já existe é apagado.

## Estado atual (verificado)

- Menu Patrimônio tem três páginas: Inventário, Equipamentos, Peças (tabelas `equipamentos` e `pecas` com dados próprios).
- A tabela `inventario` hoje tem apenas: nome, categoria, descrição, quantidade, valor total, valor pago, status de pagamento, data de aquisição, fornecedor (texto) e observação. Não existem campos de localização, responsável, nº de patrimônio, nº de série, situação, kit nem movimentações.
- Não existe registro de auditoria em tabela própria (hoje só há data/usuário da última alteração em cada registro) e nem lixeira: exclusão hoje é definitiva.
- Contas a pagar/receber gravam uma parcela por registro (campo `parcela` como texto livre). Não há gerador de parcelamento.
- O relatório por banco em Conciliação é uma tabela simples em PDF (data, tipo, descrição, valor), sem categoria, forma de pagamento nem observações.

---

## Etapa 1 — Patrimônio unificado no Inventário

**Migração (sem perder dados):** os registros de Equipamentos e Peças são copiados para o Inventário, marcados com tipo "Equipamento" / "Peça", preservando marca, modelo, nº de série, valores, fornecedor, banco e datas. As tabelas antigas continuam existindo no banco como backup, mas saem do menu e das Configurações.

**Novos campos no Inventário:** tipo (Equipamento | Peça | Veículo | Ferramenta | Outro), nº de patrimônio (gerado automático, ex. PAT-00025), marca, modelo, nº de série, localização, responsável, situação (Ativo, Em estoque, Em uso, Em manutenção, Transferido, Vendido, Baixado, Perdido, Danificado), valor unitário, vínculo com kit.

**Filtros na tela:** abas rápidas Todos | Equipamentos | Peças | Veículos | Ferramentas | Outros, mais filtros de categoria, situação, status de pagamento, localização, responsável, fornecedor, faixa de valor, período de aquisição, nº de patrimônio, nº de série e busca por nome/descrição.

**Impressão:** botões "Imprimir" e "Gerar PDF" que usam exatamente a lista filtrada na tela, com cabeçalho da empresa, filtros aplicados e totais.

**Movimentações e kits:** cada item ganha o botão "Movimentar" (Entrada, Saída/Baixa, Transferência, Manutenção, Retorno, Venda, Descarte, Vincular/Desvincular kit, Ajuste de quantidade) com quantidade, motivo, data, cliente/fornecedor, NF e observação. Cada movimentação atualiza o saldo e grava histórico, exibido em uma aba "Histórico" dentro do item. Kits: item pai com componentes independentes; ao movimentar o kit, o usuário marca só os componentes afetados e o kit passa a "parcialmente desmembrado". Função "Desmembrar kit" com seleção de componentes.

## Etapa 2 — Parcelamento em receitas e despesas

No cadastro de conta a pagar/receber, escolha entre **À vista** e **Parcelado**. Em Parcelado, quatro modalidades:

1. **Fixo:** valor total + nº de parcelas + data da 1ª + intervalo (mensal/quinzenal/semanal) → parcelas iguais com datas calculadas.
2. **Valores diferentes:** datas seguem o padrão, o usuário digita cada valor; aviso "Os valores das parcelas não correspondem ao valor total" quando a soma não fecha.
3. **Personalizado:** usuário define data e valor de cada parcela livremente, com linha opcional de Sinal, podendo adicionar/remover parcelas.
4. **Datas diferentes, valores iguais:** informa nº de parcelas e valor; só as datas são digitadas.

Sempre há uma prévia (Parcela / Vencimento / Valor) antes de salvar. Ao confirmar, o sistema cria um registro por parcela (1/12, 2/12...) ligados ao mesmo lançamento pai, para que Financeiro, Conciliação e Dashboard continuem funcionando como hoje. Editar ou excluir o lançamento pai oferece aplicar em todas as parcelas em aberto.

## Etapa 3 — Configurações → Auditoria e Recuperação

**Auditoria:** toda criação, edição, exclusão e recuperação passa a ser registrada em um log com data/hora, usuário (e-mail), ação, módulo, nome do registro, ID, e valores anteriores. Tela com filtros por período, usuário, módulo e ação, e detalhe do que mudou.

**Lixeira 7 dias:** exclusão passa a ser lógica — o registro sai das telas normais e vai para Configurações → Auditoria → Recuperação, com data de exclusão, quem excluiu e data de expiração. "Ver" mostra todos os dados no momento da exclusão; "Recuperar" pede confirmação e restaura o registro, gravando a recuperação na auditoria. Após 7 dias a exclusão definitiva acontece e também é registrada.

## Etapa 4 — Relatório financeiro profissional em PDF

Nova tela de Relatório Financeiro com filtros: período, conta/banco, tipo (receitas/despesas), categoria, cliente, fornecedor, forma de pagamento e status; botão **Gerar relatório**, e depois **Gerar PDF**, **Imprimir** e **Fechar** (que não aparecem no PDF).

Documento em A4 retrato, com aparência de documento corporativo (sem cards, gráficos ou visual de dashboard):

- Cabeçalho: logo, nome da empresa, CNPJ, título "RELATÓRIO FINANCEIRO", período e conta.
- Resumo financeiro: saldo inicial, entradas, saídas, saldo final.
- Seções **RECEITAS** e **DESPESAS**, cada lançamento com data, tipo, descrição, categoria, cliente/fornecedor, conta, forma de pagamento, valor, status e **Observações completas** (texto integral do campo já existente, nunca cortado). Campos vazios são omitidos.
- Totais por seção e quadro final "RESUMO DO PERÍODO".
- Rodapé em todas as páginas com nome da empresa, "Relatório Financeiro" e "Página X de Y"; na última, data/hora de geração.
- Cabeçalho repetido nas páginas seguintes, quebra de página que não separa descrição da observação, legível em preto e branco.

Nenhuma tabela financeira nova é criada; o relatório apenas lê e organiza os lançamentos existentes.

---

## Detalhes técnicos

- Migrações: novas colunas em `inventario` (tipo, numero_patrimonio, marca, modelo, numero_serie, localizacao, responsavel, situacao, valor_unitario, kit_id, deleted_at/deleted_by); nova tabela `inventario_movimentacoes`; nova tabela `audit_log`; coluna `deleted_at`/`deleted_by` nas tabelas com lixeira; colunas de agrupamento de parcelamento em `contas_pagar`/`contas_receber` (lançamento pai, modalidade). Todas com GRANT + RLS no padrão compartilhado já usado no projeto.
- Auditoria e lixeira via triggers no banco, para cobrir qualquer tela sem depender de código de UI.
- Exclusão definitiva após 7 dias por rotina agendada, também registrada no log.
- Listagens passam a filtrar `deleted_at is null`; `CrudPage` e páginas próprias passam a excluir logicamente.
- Rotas removidas do menu: `/equipamentos` e `/pecas` (arquivos e tabelas mantidos por segurança).
- PDF do relatório e da impressão do Inventário com jsPDF/autoTable já usados, em layout novo A4.
