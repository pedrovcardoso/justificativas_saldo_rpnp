# Guia de Integração do Frontend
## Autenticação via Keycloak para Sistemas do STEFAN

**Versão 1.0**  
**Área Responsável:** Assessoria do Tesouro  
**Servidor Responsável pela Elaboração:** Pedro Vinicius Campos

Documento destinado a desenvolvedores de frontend responsáveis por integrar sistemas do STEFAN ao serviço corporativo de autenticação.

---

### Antes de começar

**Pré-requisito obrigatório:** o sistema de origem deve entrar em contato com a Assessoria do Tesouro para solicitar o cadastro do sistema no Keycloak. O contato deverá ser realizado pelo e-mail **steplanejamento@fazenda.mg.gov.br**. Somente após esse cadastro será possível configurar corretamente client, URLs de retorno e permissões iniciais de acesso ao serviço.

---

### 1. Objetivo e benefícios da integração

Este serviço centraliza a autenticação dos sistemas por meio do Keycloak, padronizando o processo de login e reduzindo a necessidade de cada sistema implementar mecanismos próprios de autenticação.

*   Centralização da autenticação e padronização do fluxo de login entre sistemas.
*   Suporte a Single Sign-On (SSO), reduzindo múltiplos logins para o usuário final.
*   Uso de protocolos padrão de mercado (OpenID Connect / OAuth2).
*   Integração com provedores externos de identidade, incluindo Gov.br e Microsoft.
*   Emissão de tokens padronizados (`access_token`, `id_token` e `refresh_token`) para autenticação e autorização.

---

### 2. Visão geral do fluxo

*   O frontend exibe a tela de login com os botões de acesso via Gov.br e Microsoft.
*   Após o clique, o usuário é redirecionado para o provedor escolhido.
*   Ao concluir a autenticação, o frontend recebe um parâmetro `code` na URI de callback.
*   O frontend troca esse `code` por tokens no token endpoint do Keycloak.
*   Com o `access_token` em mãos, o frontend consulta o backend do Tesouro para validar o acesso do usuário ao sistema desejado.
*   Se o acesso for autorizado, o frontend passa a usar o `access_token` em todas as chamadas protegidas ao backend.

---

### 3. Tela de login do sistema

Na tela de login, o frontend deverá manter apenas os elementos visuais do sistema e incluir dois botões de autenticação:
*   Entrar com Gov.br
*   Entrar com Microsoft

Os botões podem seguir o estilo visual do sistema, desde que direcionem corretamente o usuário para as URLs oficiais do fluxo de autenticação.

#### 3.1 Exemplo de HTML

```html
<div class="login-buttons">
  <a class="btn-login btn-gov" href="link repassado pela equipe da assessoria após cadastro no keycloak">
    Entrar com Gov.br
  </a>
  <a class="btn-login btn-ms" href="link repassado pela equipe da assessoria após cadastro no keycloak">
    Entrar com Microsoft
  </a>
</div>
```

#### 3.2 Exemplo de CSS

```css
.login-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 320px;
}

.btn-login {
  display: block;
  text-align: center;
  padding: 12px 16px;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  color: white;
  font-family: Arial, sans-serif;
}

.btn-gov { background-color: #1351b4; }
.btn-gov:hover { background-color: #0c3d87; }

.btn-ms { background-color: #2f2f2f; }
.btn-ms:hover { background-color: #1f1f1f; }
```

---

### 4. Passo a passo do fluxo de autenticação

#### 4.1 Início do login

Ao clicar em um dos botões, o frontend deverá redirecionar o usuário para a URL correspondente ao provedor de identidade. Links serão repassados pela Assessoria do Tesouro após cadastro do sistema de origem no Keycloak.

**Exemplo de link:**

*   **Botão Gov.br** → `https://keycloak.fazenda.mg.gov.br/realms/tesouro/protocol/openid-connect/auth?kc_idp_hint=govbr&client_id=SEU_CLIENT_ID&redirect_uri=SUA_URI_CALLBACK&response_type=code&scope=openid%20profile%20email`
*   **Botão Microsoft** → `https://keycloak.fazenda.mg.gov.br/realms/tesouro/protocol/openid-connect/auth?kc_idp_hint=microsoft&client_id=SEU_CLIENT_ID&redirect_uri=SUA_URI_CALLBACK&response_type=code&scope=openid%20profile%20email`

#### 4.2 Callback da autenticação

Se a autenticação for concluída com sucesso, o navegador retornará para a URI de callback configurada para o sistema com um parâmetro `code` na URL. Exemplo:

`http://localhost:3000/auth/callback?code=XXXXXXXXXXXX`

Esse code não é o token final da sessão. Ele deve ser trocado pelos tokens do usuário no token endpoint do Keycloak.

#### 4.3 Troca do code por tokens

O frontend deverá realizar uma requisição HTTP POST para o token endpoint do Keycloak para obter os tokens da sessão autenticada.

`https://keycloak.fazenda.mg.gov.br/realms/tesouro/protocol/openid-connect/token`

Os principais tokens retornados são:
*   `access_token`: token usado para chamar APIs protegidas do backend.
*   `id_token`: token com informações de identidade do usuário.
*   `refresh_token`: token utilizado para renovação da sessão, quando aplicável.

#### 4.4 Exemplo de chamada no frontend (JavaScript)

```javascript
const TOKEN_URL = "https://keycloak.fazenda.mg.gov.br/realms/tesouro/protocol/openid-connect/token";

async function trocarCodePorToken(code) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: "SEU_CLIENTE",
    code: code,
    redirect_uri: "SUA_URI_REDIRECIONAMENTO",
    // Se o client utilizar PKCE obrigatório, incluir também:
    // code_verifier: "SEU_CODE_VERIFIER"
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  const data = await response.json();
  return data;
}

const params = new URLSearchParams(window.location.search);
const code = params.get("code");
if (code) {
  trocarCodePorToken(code);
}
```

---

### 5. Validação de acesso aos sistemas do STEFAN

Após obter os tokens, o frontend deverá consultar o backend do Tesouro para verificar se o usuário autenticado possui acesso ao sistema desejado dentro do ecossistema STEFAN.

O backend executará, internamente, as seguintes etapas:
*   Validação do `access_token` recebido no cabeçalho Authorization.
*   Extração da claim CPF/CNPJ do usuário autenticado.
*   Consulta no banco de dados para verificar se o usuário possui acesso ao sistema informado.

Esta validação responde somente se o usuário possui ou não acesso ao sistema. Regras internas de autorização — como unidades, módulos, perfis e operações específicas — deverão ser tratadas pelo próprio sistema consumidor.

#### 5.1 Endpoint de validação de acesso

`POST http://172.23.213.22:5050/validar-acesso-sistema`

**Headers obrigatórios:**
*   `Authorization: Bearer <access_token>`
*   `Content-Type: application/json`

**Body da requisição:**
```json
{
  "id_sistema": "CODIGO_DO_SEU_SISTEMA_NO_STEFAN"
}
```

**Exemplo de chamada em JavaScript:**
```javascript
async function validarAcessoSistema(accessToken, idSistema) {
  const response = await fetch("http://172.23.213.22:5050/validar-acesso-sistema", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify({ id_sistema: idSistema })
  });
  
  const data = await response.json();
  return { status: response.status, data };
}
```

#### 5.2 Tratamento do retorno

O backend devolverá ao frontend se o usuário está autorizado ou não para o sistema informado.

#### 5.3 Possíveis respostas

| Status HTTP | Situação | Ação esperada do frontend |
| :--- | :--- | :--- |
| 200 | Usuário autorizado | Carregar a aplicação normalmente. |
| 403 | Usuário sem acesso ao sistema | Bloquear o carregamento e exibir mensagem de acesso negado. |
| 400 | Requisição inválida (ex.: id_sistema ausente) | Corrigir payload enviado pelo frontend. |
| 401 | Token ausente, inválido ou expirado | Tratar como sessão inválida/expirada e iniciar renovação ou novo login. |
| 500 | Falha técnica interna | Exibir erro genérico e permitir nova tentativa. |

---

### 6. Uso do access_token nas demais chamadas do backend

Depois que o frontend autenticar o usuário e validar o acesso ao sistema, todas as demais chamadas para endpoints protegidos do backend deverão enviar o `access_token` no cabeçalho Authorization como Bearer Token.

`Authorization: Bearer <access_token>`

O frontend não deve usar o `id_token` como bearer token nas chamadas de API. O token apropriado para acesso a APIs é o `access_token`.

**Exemplo genérico de cliente HTTP reutilizável:**

```javascript
async function chamarBackendComToken(url, accessToken, metodo = "GET", body = null) {
  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };

  const options = { method: metodo, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }
  return { status: response.status, data };
}
```

O backend validará o JWT em cada requisição protegida e aplicará as regras de autorização do recurso solicitado.

---

### 7. Boas práticas para armazenamento e renovação de tokens no frontend

O frontend deve tratar os tokens como credenciais sensíveis e centralizar o gerenciamento da sessão autenticada.

*   Evitar imprimir tokens em logs de console ou ferramentas de debug.
*   Centralizar a autenticação em um único serviço/módulo do frontend.
*   Usar o `access_token` somente nas chamadas aos endpoints protegidos.
*   Tratar respostas 401 como sessão inválida ou expirada.
*   Renovar a sessão de forma controlada quando o token estiver próximo do vencimento ou quando o backend indicar necessidade de novo login.

Para aplicações JavaScript, é possível utilizar o adaptador oficial `keycloak-js`, que facilita inicialização do client, login, logout, verificação de autenticação e atualização de tokens.

```bash
npm install keycloak-js
```

```javascript
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'https://SEU_KEYCLOAK',
  realm: 'tesouro',
  clientId: 'SEU_CLIENT_ID'
});

async function initAuth() {
  const authenticated = await keycloak.init({ onLoad: 'check-sso' });
  console.log('authenticated?', authenticated);
}

// Exemplo de atualização de token
await keycloak.updateToken(30);
```

---

### 8. Responsabilidades do sistema consumidor

O sistema consumidor (frontend e backend próprio do sistema) deverá ser responsável por:

*   Exibir os botões de login e iniciar corretamente o fluxo de autenticação.
*   Trocar o code por tokens no token endpoint do Keycloak.
*   Consultar o backend do Tesouro para validar o acesso inicial ao sistema.
*   Enviar o `access_token` em todas as chamadas subsequentes aos serviços protegidos.
*   Implementar as regras internas de permissão do próprio sistema (módulos, unidades, operações, perfis e afins).
*   Tratar adequadamente respostas 200, 400, 401, 403 e 500.

---

### 9. Checklist rápido para o desenvolvedor de frontend

*   [ ] Confirmar com a Assessoria do Tesouro que o sistema foi cadastrado no Keycloak.
*   [ ] Configurar a tela de login com os botões Gov.br e Microsoft.
*   [ ] Configurar corretamente a URI de callback do sistema.
*   [ ] Implementar a troca do code por tokens no token endpoint do Keycloak.
*   [ ] Armazenar e gerenciar a sessão autenticada no frontend.
*   [ ] Chamar o endpoint `/validar-acesso-sistema` antes de carregar a aplicação.
*   [ ] Enviar o `access_token` como Bearer Token em todas as chamadas protegidas ao backend.
*   [ ] Implementar as regras internas de autorização do próprio sistema consumidor.