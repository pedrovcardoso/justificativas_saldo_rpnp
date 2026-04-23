<div align="center">

<img src="frontend/assets/images/header_logo_sccg.png" alt="Logo SCCG" width="300"/>

<br>

# Sistema de Gestão e Monitoramento de Restos a Pagar

<br>

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-orange?style=for-the-badge)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white)

</div>

## Descrição
Este sistema nasceu da necessidade de aprimorar o controle de restos a pagar do Estado de Minas Gerais, consolidando as justificativas específicas de cada Unidade Orçamentária. 

O formato proposto padroniza a informação e gera maior tempestividade de resposta, facilitando o alinhamento com o **Cofin** para a tomada de decisão estratégica quanto à manutenção ou cancelamento dos saldos contábeis.

## Escopo
Rede de governo do Estado de Minas Gerais: [restosapagar.sccg.fazenda.gov.br](https://restosapagar.sccg.fazenda.gov.br)

## Status do Projeto
Atualmente **em desenvolvimento**. O avanço para a fase de homologação está condicionado à aprovação do domínio `restosapagar.sccg.fazenda.gov.br` e à disponibilização da integração com o **Keycloak** para autenticação via SSO na rede de governo do Estado. Ambas as solicitações foram formalizadas e estão em análise pela área responsável.

## Principais Funcionalidades

- **Dashboard Executivo**: Visualização resumida de saldos totais, volumes em análise, concluídos e pendentes.
- **Relatórios Dinâmicos**: Tabela avançada com filtros multicamadas (painel lateral + filtros por coluna).
- **Fluxo de Aprovação**:
  - Registro de decisão (**Manter** ou **Cancelar**).
  - Avaliação técnica (**Aceito** ou **Rejeitado**).
  - Status automático baseado na combinação de decisão e avaliação.
- **Gestão de Legislação**: Biblioteca de normas relacionadas aos processos de restos a pagar.
- **Padronização de Justificativas**: Sistema de formulários dinâmicos e personalizados para cada cenário, garantindo a conformidade e qualidade das informações registradas.
- **Notificações**: Sistema de avisos para usuários sobre pendências ou prazos.

## Tecnologias
- **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript
- **Backend:** Next.js (Node.js)
- **Banco de Dados:** MySQL
- **Autenticação:** [Keycloak](/docs/KEYCLOAK.md) (em implementação)

### Bibliotecas e Dependências

**Backend** — gerenciadas via [backend/package.json](backend/package.json) e instaladas com `npm install`:

| Pacote | Descrição |
| :--- | :--- |
| `next` | Framework para rotas de API e renderização |
| `react` / `react-dom` | Motor de renderização do Next.js |
| `mysql2` | Conexão com o banco de dados MySQL |

**Frontend** — carregadas via CDN, sem instalação necessária:

| Pacote | Descrição |
| :--- | :--- |
| `tailwindcss` | Estilização e processamento CSS |
| `boxicons` | Biblioteca de ícones |
| `sheetjs (xlsx)` | Leitura e exportação de arquivos Excel |
| `xlsx-js-style` | Estilização de células em arquivos Excel |
| `chart.js` | Gráficos e visualizações de dados |
| `chartjs-plugin-datalabels` | Plugin de rótulos para Chart.js |
| `apexcharts` | Gráficos interativos avançados |

## Pré-requisitos
- **Node.js** >= 18.0.0
- **MySQL Server** >= 8.0
- Gerenciador de pacotes **npm** ou **yarn**

## Como Rodar o Projeto

### 1. Instalação de Dependências
Navegue até a pasta do backend e instale os pacotes necessários:
```bash
cd backend
npm install
```
   > **Problemas de Rede (SSL)** Se o comando falhar ou demorar muito (comum na rede de governo), tente:
   > ```bash
   > npm config set strict-ssl false
   > npm install
   > npm config set strict-ssl true
   > ```

### 2. Configuração de Variáveis de Ambiente
O sistema utiliza um arquivo `.env` para configurações de banco de dados.
1. Na pasta `backend`, localize o arquivo `.env.example`.
2. Crie uma cópia e renomeie para `.env`.
3. Preencha as informações conforme seu ambiente:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=seu_usuario
   DB_PASSWORD=sua_senha
   DB_NAME=rppn_db
   ```

### 3. Execução
Para iniciar o servidor de desenvolvimento:
```bash
npm run dev
```
O sistema estará disponível em `http://localhost:3000`.

### 4. Frontend Estático
A interface principal é servida diretamente pelo arquivo estático. Abra o arquivo `index.html` na raiz do projeto no seu navegador, ou utilize a extensão **Live Server** no VS Code para desenvolvimento com recarregamento automático.

---

## Responsável
**Pedro Henrique Vieira Cardoso**  
SCCG - Superintendência Central de Contadoria Geral  
[pedro.cardoso@fazenda.mg.gov.br](mailto:pedro.cardoso@fazenda.mg.gov.br)
