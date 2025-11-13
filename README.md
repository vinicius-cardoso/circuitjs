# Simulador de Circuitos Resistivos

Um simulador interativo de circuitos resistivos em JavaScript puro, que permite desenhar circuitos com resistências e fontes de tensão, e medir tensões e correntes em qualquer ponto.

## Características

- ✨ Interface gráfica intuitiva com sistema de grid
- 🔌 Componentes disponíveis:
  - Fios de conexão
  - Resistências
  - Fontes de tensão
  - Ground (referência)
- 📏 Sistema de medição de tensão e corrente
- ⚡ Simulação em tempo real usando análise nodal
- 🎨 Interface moderna e responsiva

## Como Usar

### 1. Abrir o Simulador

Abra o arquivo `index.html` em qualquer navegador moderno (Chrome, Firefox, Safari, Edge).

### 2. Desenhar Componentes

#### Fios (Wire)
- Clique no botão "Fio" ou pressione `W`
- Clique e arraste no canvas para desenhar um fio
- Fios conectam componentes entre si

#### Resistores
- Clique no botão "Resistor" ou pressione `R`
- Clique e arraste no canvas para adicionar um resistor
- Clique no resistor para editar sua resistência no painel de propriedades
- Valor padrão: 1kΩ

#### Fonte de Tensão
- Clique no botão "Fonte" ou pressione `V`
- Clique e arraste no canvas para adicionar uma fonte
- O terminal positivo (+) fica no final do arrasto
- O terminal negativo (-) fica no início do arrasto
- Clique na fonte para editar sua tensão no painel de propriedades
- Valor padrão: 5V

#### Ground
- Clique no botão "Ground" ou pressione `G`
- Clique em um ponto no canvas para adicionar o ground
- **Importante**: Todo circuito precisa de pelo menos um ground para funcionar!

### 3. Editar Componentes

- Clique em qualquer resistor ou fonte de tensão
- As propriedades aparecerão no painel lateral
- Altere os valores conforme necessário

### 4. Deletar Componentes

- Clique no botão "Deletar" ou pressione `D`
- Clique no componente que deseja remover

### 5. Simular o Circuito

- Clique no botão "▶ Simular" ou pressione `Espaço`
- O simulador calculará todas as tensões e correntes
- Pontos verdes aparecerão mostrando as tensões em cada nó
- Para pausar a simulação, clique novamente no botão

### 6. Medir Tensões e Correntes

- Clique no botão "Medir" ou pressione `M`
- **Importante**: O circuito deve estar em modo de simulação
- Clique em qualquer ponto para ver:
  - **Tensão** no ponto clicado
  - **Corrente** se você clicar em um componente (resistor ou fonte)

### 7. Limpar o Circuito

- Clique no botão "🗑️ Limpar" para remover todos os componentes

## Atalhos de Teclado

| Tecla | Ação |
|-------|------|
| `W` | Selecionar ferramenta Fio |
| `R` | Selecionar ferramenta Resistor |
| `V` | Selecionar ferramenta Fonte de Tensão |
| `G` | Selecionar ferramenta Ground |
| `M` | Selecionar ferramenta Medir |
| `D` | Selecionar ferramenta Deletar |
| `Espaço` | Iniciar/Parar Simulação |
| `ESC` | Cancelar ação atual |

## Exemplo de Circuito Simples

1. Adicione um **Ground** (pressione `G` e clique no canvas)
2. Adicione uma **Fonte de Tensão** (pressione `V`, arraste do ground para cima)
3. Adicione um **Resistor** (pressione `R`, arraste do terminal positivo da fonte)
4. Adicione um **Fio** (pressione `W`) para fechar o circuito do resistor de volta ao ground
5. Pressione **Espaço** para simular
6. Pressione **M** e clique em pontos diferentes para ver tensões e correntes

## Tecnologias Utilizadas

- **HTML5 Canvas** - Para desenho gráfico
- **JavaScript Puro** - Sem dependências externas
- **Análise Nodal** - Método de resolução de circuitos
- **Eliminação de Gauss** - Para resolver sistemas lineares

## Como Funciona

O simulador usa **análise nodal (Node Voltage Analysis)** para resolver os circuitos:

1. Identifica todos os nós (pontos de conexão) no circuito
2. Define o ground como referência (0V)
3. Cria um sistema de equações lineares usando as Leis de Kirchhoff
4. Resolve o sistema usando eliminação de Gauss com pivotamento parcial
5. Calcula as correntes através dos componentes usando a Lei de Ohm

## Limitações

- Apenas circuitos **resistivos** (resistores e fontes de tensão DC)
- Não suporta capacitores, indutores ou fontes de corrente
- Não suporta análise transitória (apenas estado estacionário)
- Circuitos devem ter pelo menos um ground

## Solução de Problemas

### "Erro ao simular o circuito"
- Verifique se há pelo menos um ground no circuito
- Certifique-se de que o circuito está completo (sem componentes flutuantes)
- Verifique se todos os resistores têm valores válidos (> 0)

### Medições não aparecem
- Certifique-se de que a simulação está ativa (botão "⏸ Parar" visível)
- Clique exatamente nos pontos de conexão ou componentes

### Valores estranhos
- Verifique as conexões do circuito
- Confirme que os valores dos componentes estão corretos
- Certifique-se de que não há curto-circuitos não intencionais

## Autor

Simulador de Circuitos criado com JavaScript, HTML5 e CSS3.

## Licença

Projeto de código aberto para fins educacionais.
