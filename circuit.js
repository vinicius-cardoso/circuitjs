// Simulador de Circuitos Resistivos
class CircuitSimulator {
    constructor() {
        this.canvas = document.getElementById('circuit-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Configurações do grid
        this.gridSize = 20;
        this.canvasWidth = 1000;
        this.canvasHeight = 600;

        // Define tamanho do canvas
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;

        // Estado
        this.currentTool = 'wire';
        this.isSimulating = false;
        this.selectedComponent = null;
        this.dragStart = null;

        // Componentes do circuito
        this.wires = [];
        this.resistors = [];
        this.voltageSources = [];
        this.grounds = [];

        // Solver
        this.solver = new CircuitSolver();

        // Inicializa
        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        // Botões de ferramentas
        document.getElementById('tool-wire').addEventListener('click', () => this.selectTool('wire'));
        document.getElementById('tool-resistor').addEventListener('click', () => this.selectTool('resistor'));
        document.getElementById('tool-voltage').addEventListener('click', () => this.selectTool('voltage'));
        document.getElementById('tool-ground').addEventListener('click', () => this.selectTool('ground'));
        document.getElementById('tool-measure').addEventListener('click', () => this.selectTool('measure'));
        document.getElementById('tool-delete').addEventListener('click', () => this.selectTool('delete'));

        // Botões de ação
        document.getElementById('btn-simulate').addEventListener('click', () => this.toggleSimulation());
        document.getElementById('btn-clear').addEventListener('click', () => this.clearCircuit());

        // Canvas
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        // Atalhos de teclado
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    selectTool(tool) {
        this.currentTool = tool;

        // Atualiza UI
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`tool-${tool}`).classList.add('active');

        // Limpa seleção
        this.selectedComponent = null;
        this.dragStart = null;
        this.updatePropertiesPanel();
    }

    handleKeyboard(e) {
        const key = e.key.toLowerCase();
        if (key === 'w') this.selectTool('wire');
        else if (key === 'r') this.selectTool('resistor');
        else if (key === 'v') this.selectTool('voltage');
        else if (key === 'g') this.selectTool('ground');
        else if (key === 'm') this.selectTool('measure');
        else if (key === 'd') this.selectTool('delete');
        else if (key === ' ') {
            e.preventDefault();
            this.toggleSimulation();
        } else if (key === 'escape') {
            this.dragStart = null;
            this.selectedComponent = null;
            this.render();
        }
    }

    getGridPosition(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.round((clientX - rect.left) / this.gridSize) * this.gridSize;
        const y = Math.round((clientY - rect.top) / this.gridSize) * this.gridSize;
        return { x, y };
    }

    handleMouseDown(e) {
        const pos = this.getGridPosition(e.clientX, e.clientY);

        if (this.currentTool === 'wire' || this.currentTool === 'resistor' || this.currentTool === 'voltage') {
            this.dragStart = pos;
        }
    }

    handleMouseMove(e) {
        if (!this.dragStart) return;

        const pos = this.getGridPosition(e.clientX, e.clientY);

        // Renderiza preview
        this.render();
        this.ctx.strokeStyle = '#667eea';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.dragStart.x, this.dragStart.y);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    handleMouseUp(e) {
        if (!this.dragStart) return;

        const pos = this.getGridPosition(e.clientX, e.clientY);

        // Verifica se não é apenas um clique (sem arrasto)
        if (pos.x === this.dragStart.x && pos.y === this.dragStart.y) {
            this.dragStart = null;
            return;
        }

        // Adiciona componente
        if (this.currentTool === 'wire') {
            this.wires.push({
                x: this.dragStart.x,
                y: this.dragStart.y,
                x2: pos.x,
                y2: pos.y
            });
        } else if (this.currentTool === 'resistor') {
            this.resistors.push({
                x: this.dragStart.x,
                y: this.dragStart.y,
                x2: pos.x,
                y2: pos.y,
                resistance: 1000 // 1k ohm padrão
            });
        } else if (this.currentTool === 'voltage') {
            this.voltageSources.push({
                x: this.dragStart.x,
                y: this.dragStart.y,
                x2: pos.x,
                y2: pos.y,
                voltage: 5 // 5V padrão
            });
        }

        this.dragStart = null;
        this.render();
    }

    handleClick(e) {
        const pos = this.getGridPosition(e.clientX, e.clientY);

        if (this.currentTool === 'ground') {
            // Adiciona ground
            this.grounds.push({ x: pos.x, y: pos.y, x2: pos.x, y2: pos.y });
            this.render();
        } else if (this.currentTool === 'delete') {
            this.deleteComponentAt(pos);
        } else if (this.currentTool === 'measure') {
            this.measureAt(pos, e);
        } else {
            // Seleciona componente para edição
            this.selectComponentAt(pos);
        }
    }

    deleteComponentAt(pos) {
        const tolerance = this.gridSize;

        // Remove fios
        this.wires = this.wires.filter(w => {
            return !this.isPointNearLine(pos, w, tolerance);
        });

        // Remove resistores
        this.resistors = this.resistors.filter(r => {
            return !this.isPointNearLine(pos, r, tolerance);
        });

        // Remove fontes
        this.voltageSources = this.voltageSources.filter(v => {
            return !this.isPointNearLine(pos, v, tolerance);
        });

        // Remove grounds
        this.grounds = this.grounds.filter(g => {
            const dist = Math.sqrt((pos.x - g.x) ** 2 + (pos.y - g.y) ** 2);
            return dist > tolerance;
        });

        this.render();
    }

    isPointNearLine(point, line, tolerance) {
        const x1 = line.x, y1 = line.y;
        const x2 = line.x2, y2 = line.y2;
        const px = point.x, py = point.y;

        const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        if (length === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2) < tolerance;

        const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / (length ** 2)));
        const projX = x1 + t * (x2 - x1);
        const projY = y1 + t * (y2 - y1);

        const dist = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
        return dist < tolerance;
    }

    selectComponentAt(pos) {
        const tolerance = this.gridSize;

        // Busca resistor
        for (let i = 0; i < this.resistors.length; i++) {
            if (this.isPointNearLine(pos, this.resistors[i], tolerance)) {
                this.selectedComponent = { type: 'resistor', index: i };
                this.updatePropertiesPanel();
                this.render();
                return;
            }
        }

        // Busca fonte de tensão
        for (let i = 0; i < this.voltageSources.length; i++) {
            if (this.isPointNearLine(pos, this.voltageSources[i], tolerance)) {
                this.selectedComponent = { type: 'voltage', index: i };
                this.updatePropertiesPanel();
                this.render();
                return;
            }
        }

        // Nenhum componente selecionado
        this.selectedComponent = null;
        this.updatePropertiesPanel();
        this.render();
    }

    updatePropertiesPanel() {
        const panel = document.getElementById('properties-panel');

        if (!this.selectedComponent) {
            panel.innerHTML = '<p class="help-text">Clique em um componente para editar suas propriedades</p>';
            return;
        }

        if (this.selectedComponent.type === 'resistor') {
            const resistor = this.resistors[this.selectedComponent.index];
            panel.innerHTML = `
                <div class="property-input">
                    <label>Resistência (Ω)</label>
                    <input type="number" id="prop-resistance" value="${resistor.resistance}" min="0.1" step="100">
                </div>
            `;

            document.getElementById('prop-resistance').addEventListener('input', (e) => {
                resistor.resistance = parseFloat(e.target.value) || 1;
                if (this.isSimulating) {
                    this.simulate();
                }
                this.render();
            });
        } else if (this.selectedComponent.type === 'voltage') {
            const source = this.voltageSources[this.selectedComponent.index];
            panel.innerHTML = `
                <div class="property-input">
                    <label>Tensão (V)</label>
                    <input type="number" id="prop-voltage" value="${source.voltage}" step="0.1">
                </div>
            `;

            document.getElementById('prop-voltage').addEventListener('input', (e) => {
                source.voltage = parseFloat(e.target.value) || 0;
                if (this.isSimulating) {
                    this.simulate();
                }
                this.render();
            });
        }
    }

    measureAt(pos, event) {
        if (!this.isSimulating) {
            alert('Execute a simulação primeiro (botão ▶ Simular ou Space)');
            return;
        }

        const voltage = this.solver.getVoltageAt(pos.x, pos.y);

        // Verifica se há um componente nesta posição
        let currentInfo = '';
        const tolerance = this.gridSize;

        for (let i = 0; i < this.resistors.length; i++) {
            if (this.isPointNearLine(pos, this.resistors[i], tolerance)) {
                const current = this.solver.getCurrentAt('resistor', i);
                currentInfo = `\nCorrente: ${this.formatCurrent(current)}`;
                break;
            }
        }

        for (let i = 0; i < this.voltageSources.length; i++) {
            if (this.isPointNearLine(pos, this.voltageSources[i], tolerance)) {
                const current = this.solver.getCurrentAt('voltage', i);
                currentInfo = `\nCorrente: ${this.formatCurrent(current)}`;
                break;
            }
        }

        const display = document.getElementById('measurement-display');
        display.textContent = `Tensão: ${this.formatVoltage(voltage)}${currentInfo}`;
        display.style.left = `${event.clientX + 10}px`;
        display.style.top = `${event.clientY + 10}px`;
        display.classList.add('show');

        setTimeout(() => {
            display.classList.remove('show');
        }, 3000);
    }

    formatVoltage(v) {
        return `${v.toFixed(2)} V`;
    }

    formatCurrent(i) {
        const absI = Math.abs(i);
        if (absI >= 1) return `${i.toFixed(3)} A`;
        if (absI >= 0.001) return `${(i * 1000).toFixed(2)} mA`;
        return `${(i * 1000000).toFixed(2)} µA`;
    }

    toggleSimulation() {
        this.isSimulating = !this.isSimulating;

        const btn = document.getElementById('btn-simulate');
        if (this.isSimulating) {
            btn.textContent = '⏸ Parar';
            btn.classList.add('simulating');
            this.simulate();
        } else {
            btn.textContent = '▶ Simular';
            btn.classList.remove('simulating');
        }

        this.render();
    }

    simulate() {
        const circuit = {
            resistors: this.resistors,
            voltageSources: this.voltageSources,
            grounds: this.grounds,
            wires: this.wires
        };

        const success = this.solver.solve(circuit);

        if (!success) {
            alert('Erro ao simular o circuito. Verifique se há um ground e se o circuito está completo.');
            this.isSimulating = false;
            document.getElementById('btn-simulate').textContent = '▶ Simular';
            document.getElementById('btn-simulate').classList.remove('simulating');
        }

        this.render();
    }

    clearCircuit() {
        if (confirm('Tem certeza que deseja limpar todo o circuito?')) {
            this.wires = [];
            this.resistors = [];
            this.voltageSources = [];
            this.grounds = [];
            this.isSimulating = false;
            this.selectedComponent = null;

            document.getElementById('btn-simulate').textContent = '▶ Simular';
            document.getElementById('btn-simulate').classList.remove('simulating');

            this.updatePropertiesPanel();
            this.render();
        }
    }

    render() {
        // Limpa canvas
        this.ctx.fillStyle = '#fafafa';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Desenha grid
        this.drawGrid();

        // Desenha componentes
        this.drawWires();
        this.drawResistors();
        this.drawVoltageSources();
        this.drawGrounds();

        // Desenha valores se simulando
        if (this.isSimulating) {
            this.drawSimulationValues();
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;

        // Linhas verticais
        for (let x = 0; x <= this.canvasWidth; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvasHeight);
            this.ctx.stroke();
        }

        // Linhas horizontais
        for (let y = 0; y <= this.canvasHeight; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvasWidth, y);
            this.ctx.stroke();
        }

        // Pontos de conexão
        this.ctx.fillStyle = '#ccc';
        for (let x = 0; x <= this.canvasWidth; x += this.gridSize) {
            for (let y = 0; y <= this.canvasHeight; y += this.gridSize) {
                this.ctx.beginPath();
                this.ctx.arc(x, y, 2, 0, 2 * Math.PI);
                this.ctx.fill();
            }
        }
    }

    drawWires() {
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 3;

        this.wires.forEach(wire => {
            this.ctx.beginPath();
            this.ctx.moveTo(wire.x, wire.y);
            this.ctx.lineTo(wire.x2, wire.y2);
            this.ctx.stroke();
        });
    }

    drawResistors() {
        this.resistors.forEach((resistor, index) => {
            const isSelected = this.selectedComponent?.type === 'resistor' &&
                             this.selectedComponent?.index === index;

            this.ctx.strokeStyle = isSelected ? '#ef4444' : '#333';
            this.ctx.lineWidth = 3;

            const x1 = resistor.x;
            const y1 = resistor.y;
            const x2 = resistor.x2;
            const y2 = resistor.y2;

            const dx = x2 - x1;
            const dy = y2 - y1;
            const length = Math.sqrt(dx * dx + dy * dy);
            const ux = dx / length;
            const uy = dy / length;

            const zigzagLength = length * 0.5;
            const zigzagStart = length * 0.25;

            // Linha inicial
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x1 + ux * zigzagStart, y1 + uy * zigzagStart);
            this.ctx.stroke();

            // Zigzag (resistor)
            const zigzagCount = 6;
            const zigzagWidth = 8;
            const segmentLength = zigzagLength / zigzagCount;

            this.ctx.beginPath();
            this.ctx.moveTo(x1 + ux * zigzagStart, y1 + uy * zigzagStart);

            for (let i = 0; i < zigzagCount; i++) {
                const t = zigzagStart + (i + 0.5) * segmentLength;
                const perpX = -uy * zigzagWidth * (i % 2 === 0 ? 1 : -1);
                const perpY = ux * zigzagWidth * (i % 2 === 0 ? 1 : -1);

                this.ctx.lineTo(x1 + ux * t + perpX, y1 + uy * t + perpY);
            }

            this.ctx.lineTo(x1 + ux * (zigzagStart + zigzagLength),
                          y1 + uy * (zigzagStart + zigzagLength));
            this.ctx.stroke();

            // Linha final
            this.ctx.beginPath();
            this.ctx.moveTo(x1 + ux * (zigzagStart + zigzagLength),
                          y1 + uy * (zigzagStart + zigzagLength));
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();

            // Label
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            this.ctx.fillStyle = '#333';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${this.formatResistance(resistor.resistance)}`, midX - uy * 15, midY + ux * 15);
        });
    }

    formatResistance(r) {
        if (r >= 1000000) return `${(r / 1000000).toFixed(1)}MΩ`;
        if (r >= 1000) return `${(r / 1000).toFixed(1)}kΩ`;
        return `${r.toFixed(1)}Ω`;
    }

    drawVoltageSources() {
        this.voltageSources.forEach((source, index) => {
            const isSelected = this.selectedComponent?.type === 'voltage' &&
                             this.selectedComponent?.index === index;

            this.ctx.strokeStyle = isSelected ? '#ef4444' : '#333';
            this.ctx.lineWidth = 3;

            const x1 = source.x;
            const y1 = source.y;
            const x2 = source.x2;
            const y2 = source.y2;

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            const dx = x2 - x1;
            const dy = y2 - y1;
            const length = Math.sqrt(dx * dx + dy * dy);
            const ux = dx / length;
            const uy = dy / length;

            const circleRadius = 15;

            // Linha do ponto 1 ao círculo
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(midX - ux * circleRadius, midY - uy * circleRadius);
            this.ctx.stroke();

            // Círculo
            this.ctx.beginPath();
            this.ctx.arc(midX, midY, circleRadius, 0, 2 * Math.PI);
            this.ctx.stroke();

            // Sinais + e -
            this.ctx.fillStyle = '#333';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            // Sinal + (próximo ao terminal positivo - x2, y2)
            this.ctx.fillText('+', midX + ux * 5, midY + uy * 5);

            // Sinal - (próximo ao terminal negativo - x1, y1)
            this.ctx.fillText('-', midX - ux * 5, midY - uy * 5);

            // Linha do círculo ao ponto 2
            this.ctx.strokeStyle = isSelected ? '#ef4444' : '#333';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(midX + ux * circleRadius, midY + uy * circleRadius);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();

            // Label
            this.ctx.fillStyle = '#d97706';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${source.voltage.toFixed(1)}V`, midX - uy * 25, midY + ux * 25);
        });
    }

    drawGrounds() {
        this.grounds.forEach(ground => {
            const x = ground.x;
            const y = ground.y;

            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 3;

            // Símbolo de ground
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - 10);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(x - 15, y);
            this.ctx.lineTo(x + 15, y);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(x - 10, y + 5);
            this.ctx.lineTo(x + 10, y + 5);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(x - 5, y + 10);
            this.ctx.lineTo(x + 5, y + 10);
            this.ctx.stroke();

            // Label
            this.ctx.fillStyle = '#333';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GND', x, y + 25);
        });
    }

    drawSimulationValues() {
        this.ctx.font = 'bold 11px Arial';
        this.ctx.textAlign = 'center';

        // Mostra tensões em pontos de conexão
        const nodePoints = new Set();

        [...this.resistors, ...this.voltageSources, ...this.wires].forEach(comp => {
            nodePoints.add(`${comp.x},${comp.y}`);
            nodePoints.add(`${comp.x2},${comp.y2}`);
        });

        nodePoints.forEach(nodeKey => {
            const [x, y] = nodeKey.split(',').map(Number);
            const voltage = this.solver.getVoltageAt(x, y);

            // Desenha círculo
            this.ctx.fillStyle = '#10b981';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
            this.ctx.fill();

            // Desenha valor
            this.ctx.fillStyle = '#10b981';
            this.ctx.fillText(`${voltage.toFixed(2)}V`, x, y - 8);
        });
    }
}

// Inicializa o simulador quando a página carregar
window.addEventListener('DOMContentLoaded', () => {
    new CircuitSimulator();
});
