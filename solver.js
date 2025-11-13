// Circuit Solver usando análise nodal (Node Voltage Analysis)

class CircuitSolver {
    constructor() {
        this.nodeVoltages = new Map(); // Tensões nos nós
        this.componentCurrents = new Map(); // Correntes nos componentes
        this.nodeMap = new Map(); // Mapeia nós físicos para nós elétricos unificados
    }

    /**
     * Union-Find para unir nós conectados por fios
     */
    buildNodeMap(circuit) {
        this.nodeMap.clear();
        const parent = new Map();

        // Função para encontrar a raiz (com compressão de caminho)
        const find = (node) => {
            if (!parent.has(node)) {
                parent.set(node, node);
                return node;
            }
            if (parent.get(node) !== node) {
                parent.set(node, find(parent.get(node)));
            }
            return parent.get(node);
        };

        // Função para unir dois nós
        const union = (node1, node2) => {
            const root1 = find(node1);
            const root2 = find(node2);
            if (root1 !== root2) {
                parent.set(root2, root1);
            }
        };

        // Identifica todos os nós físicos
        const allNodes = new Set();
        [...circuit.resistors, ...circuit.voltageSources, ...circuit.grounds, ...circuit.wires].forEach(comp => {
            const node1 = `${comp.x},${comp.y}`;
            const node2 = `${comp.x2},${comp.y2}`;
            allNodes.add(node1);
            if (comp.x2 !== undefined) allNodes.add(node2);
        });

        // Inicializa todos os nós
        allNodes.forEach(node => find(node));

        // Une nós conectados por fios (fios são conexões de resistência zero)
        circuit.wires.forEach(wire => {
            const node1 = `${wire.x},${wire.y}`;
            const node2 = `${wire.x2},${wire.y2}`;
            union(node1, node2);
        });

        // Cria mapa de nós físicos para nós elétricos
        allNodes.forEach(node => {
            this.nodeMap.set(node, find(node));
        });
    }

    /**
     * Retorna o nó elétrico unificado para um nó físico
     */
    getElectricalNode(physicalNode) {
        return this.nodeMap.get(physicalNode) || physicalNode;
    }

    /**
     * Resolve o sistema de equações lineares usando eliminação de Gauss
     * @param {number[][]} A - Matriz de condutâncias
     * @param {number[]} b - Vetor de correntes
     * @returns {number[]} - Vetor solução (tensões dos nós)
     */
    solveLinearSystem(A, b) {
        const n = A.length;

        // Cria cópia para não modificar os originais
        const matrix = A.map((row, i) => [...row, b[i]]);

        // Eliminação de Gauss com pivotamento parcial
        for (let i = 0; i < n; i++) {
            // Encontra o pivô
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(matrix[k][i]) > Math.abs(matrix[maxRow][i])) {
                    maxRow = k;
                }
            }

            // Troca linhas
            [matrix[i], matrix[maxRow]] = [matrix[maxRow], matrix[i]];

            // Torna zero abaixo do pivô
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(matrix[i][i]) < 1e-10) continue;
                const factor = matrix[k][i] / matrix[i][i];
                for (let j = i; j <= n; j++) {
                    matrix[k][j] -= factor * matrix[i][j];
                }
            }
        }

        // Substituição reversa
        const x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            if (Math.abs(matrix[i][i]) < 1e-10) {
                x[i] = 0;
                continue;
            }
            x[i] = matrix[i][n];
            for (let j = i + 1; j < n; j++) {
                x[i] -= matrix[i][j] * x[j];
            }
            x[i] /= matrix[i][i];
        }

        return x;
    }

    /**
     * Resolve o circuito usando análise nodal
     * @param {Object} circuit - Objeto contendo componentes e conexões
     * @returns {boolean} - true se resolveu com sucesso
     */
    solve(circuit) {
        this.nodeVoltages.clear();
        this.componentCurrents.clear();

        // Constrói mapa de nós conectados por fios
        this.buildNodeMap(circuit);

        // Identifica todos os nós únicos (elétricos)
        const nodes = this.identifyNodes(circuit);

        // Encontra o nó ground (referência)
        const groundNode = this.findGroundNode(circuit, nodes);
        if (groundNode === null) {
            console.warn('Nenhum ground encontrado no circuito');
            return false;
        }

        // Remove ground da lista de nós (será nossa referência = 0V)
        const nodeList = Array.from(nodes).filter(n => n !== groundNode);
        const nodeIndex = new Map(nodeList.map((node, i) => [node, i]));

        const n = nodeList.length;
        if (n === 0) {
            this.nodeVoltages.set(groundNode, 0);
            return true;
        }

        // Cria matriz de condutâncias (G) e vetor de correntes (I)
        const G = Array(n).fill(0).map(() => Array(n).fill(0));
        const I = Array(n).fill(0);

        // Processa resistores
        circuit.resistors.forEach(resistor => {
            if (!resistor.resistance || resistor.resistance <= 0) return;

            const conductance = 1 / resistor.resistance;
            const [node1, node2] = this.getComponentNodes(resistor);

            if (node1 !== groundNode && node2 !== groundNode) {
                const i1 = nodeIndex.get(node1);
                const i2 = nodeIndex.get(node2);
                G[i1][i1] += conductance;
                G[i2][i2] += conductance;
                G[i1][i2] -= conductance;
                G[i2][i1] -= conductance;
            } else if (node1 !== groundNode) {
                const i1 = nodeIndex.get(node1);
                G[i1][i1] += conductance;
            } else if (node2 !== groundNode) {
                const i2 = nodeIndex.get(node2);
                G[i2][i2] += conductance;
            }
        });

        // Processa fontes de tensão
        // Para fontes de tensão, usamos o método modificado de análise nodal
        circuit.voltageSources.forEach(source => {
            if (!source.voltage) return;

            const [nodePos, nodeNeg] = this.getComponentNodes(source);

            // Fonte de tensão conecta nodePos a nodeNeg com diferença de potencial V
            // V = V_pos - V_neg

            if (nodePos !== groundNode && nodeNeg === groundNode) {
                // Caso simples: positivo no nó, negativo no ground
                const i = nodeIndex.get(nodePos);
                // Fixar tensão do nó = voltage da fonte
                G[i] = Array(n).fill(0);
                G[i][i] = 1;
                I[i] = source.voltage;
            } else if (nodeNeg !== groundNode && nodePos === groundNode) {
                // Negativo no nó, positivo no ground
                const i = nodeIndex.get(nodeNeg);
                G[i] = Array(n).fill(0);
                G[i][i] = 1;
                I[i] = -source.voltage;
            } else if (nodePos !== groundNode && nodeNeg !== groundNode) {
                // Ambos os nós não são ground
                const iPos = nodeIndex.get(nodePos);
                const iNeg = nodeIndex.get(nodeNeg);

                // V_pos - V_neg = voltage
                // Simplificação: forçar a relação entre os nós
                // Substituir uma equação por: V_pos - V_neg = voltage
                G[iPos] = Array(n).fill(0);
                G[iPos][iPos] = 1;
                G[iPos][iNeg] = -1;
                I[iPos] = source.voltage;
            }
        });

        // Resolve o sistema
        try {
            const voltages = this.solveLinearSystem(G, I);

            // Armazena as tensões dos nós
            this.nodeVoltages.set(groundNode, 0);
            nodeList.forEach((node, i) => {
                this.nodeVoltages.set(node, voltages[i]);
            });

            // Calcula correntes nos componentes
            this.calculateCurrents(circuit);

            return true;
        } catch (error) {
            console.error('Erro ao resolver circuito:', error);
            return false;
        }
    }

    /**
     * Identifica todos os nós únicos no circuito (nós elétricos unificados)
     */
    identifyNodes(circuit) {
        const nodes = new Set();

        // Adiciona nós de todos os componentes (usando nós elétricos unificados)
        [...circuit.resistors, ...circuit.voltageSources, ...circuit.grounds, ...circuit.wires].forEach(comp => {
            const [node1, node2] = this.getComponentNodes(comp);
            if (node1) nodes.add(node1);
            if (node2) nodes.add(node2);
        });

        return nodes;
    }

    /**
     * Encontra o nó ground
     */
    findGroundNode(circuit, nodes) {
        // Ground é definido pelos componentes de ground
        for (const ground of circuit.grounds) {
            const physicalNode = `${ground.x},${ground.y}`;
            const electricalNode = this.getElectricalNode(physicalNode);
            if (nodes.has(electricalNode)) {
                return electricalNode;
            }
        }
        return null;
    }

    /**
     * Retorna os dois nós elétricos conectados por um componente
     */
    getComponentNodes(component) {
        const physicalNode1 = `${component.x},${component.y}`;
        const physicalNode2 = `${component.x2},${component.y2}`;

        // Retorna os nós elétricos unificados
        const node1 = this.getElectricalNode(physicalNode1);
        const node2 = this.getElectricalNode(physicalNode2);

        return [node1, node2];
    }

    /**
     * Calcula as correntes em todos os componentes
     */
    calculateCurrents(circuit) {
        // Corrente em resistores: I = (V1 - V2) / R
        circuit.resistors.forEach((resistor, index) => {
            if (!resistor.resistance || resistor.resistance <= 0) return;

            const [node1, node2] = this.getComponentNodes(resistor);
            const v1 = this.nodeVoltages.get(node1) || 0;
            const v2 = this.nodeVoltages.get(node2) || 0;
            const current = (v1 - v2) / resistor.resistance;

            this.componentCurrents.set(`resistor_${index}`, current);
        });

        // Corrente em fontes de tensão
        circuit.voltageSources.forEach((source, index) => {
            // Soma correntes que saem do terminal positivo
            const [nodePos, nodeNeg] = this.getComponentNodes(source);
            const vPos = this.nodeVoltages.get(nodePos) || 0;
            const vNeg = this.nodeVoltages.get(nodeNeg) || 0;

            let current = 0;

            // Corrente através de todos os resistores conectados ao nó positivo
            circuit.resistors.forEach(resistor => {
                if (!resistor.resistance || resistor.resistance <= 0) return;

                const [r1, r2] = this.getComponentNodes(resistor);
                const vr1 = this.nodeVoltages.get(r1) || 0;
                const vr2 = this.nodeVoltages.get(r2) || 0;

                if (r1 === nodePos) {
                    current += (vr1 - vr2) / resistor.resistance;
                } else if (r2 === nodePos) {
                    current += (vr2 - vr1) / resistor.resistance;
                }
            });

            this.componentCurrents.set(`voltage_${index}`, current);
        });
    }

    /**
     * Retorna a tensão em um ponto específico
     */
    getVoltageAt(x, y) {
        const physicalNode = `${x},${y}`;
        const electricalNode = this.getElectricalNode(physicalNode);
        return this.nodeVoltages.get(electricalNode) || 0;
    }

    /**
     * Retorna a corrente em um componente
     */
    getCurrentAt(componentType, index) {
        return this.componentCurrents.get(`${componentType}_${index}`) || 0;
    }
}
