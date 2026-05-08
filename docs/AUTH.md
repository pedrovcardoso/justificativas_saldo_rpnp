# Arquitetura de Autenticação e Autorização (AUTH)

Este documento detalha o fluxo de autenticação e gestão de acesso (RBAC) baseado em **OTP (One Time Password)** e **JWT (JSON Web Token)**. O sistema foi projetado para ser autossuficiente, integrando-se aos serviços descritos em [stefan_backend_openapi.yaml](stefan_backend_openapi.yaml), mas gerenciando sua própria base de usuários e sessões.

> [!NOTE]
> Posteriormente será incluído o **Keycloak** para autenticação via login da Microsoft (SSO), conforme documentação em [KEYCLOAK.md](KEYCLOAK.md).

## 1. Estrutura de Persistência Local

Para garantir a autonomia na gestão de acessos, o backend utiliza duas tabelas vitais:

- **Tabela `otp_sessions`**: Utilizada para o fluxo de "Passwordless". O backend gera um código numérico aleatório, armazena-o temporariamente e utiliza um serviço de mensageria apenas para o despacho. A lógica de validade (10 minutos), expiração e consumo do código é gerida internamente pelo nosso banco de dados.
- **Tabela `usuarios`**: Centraliza o controle de permissões (RBAC). Como o sistema não consome *claims* de um diretório externo, esta tabela mapeia o vínculo entre o usuário (e-mail) e suas atribuições de perfil (`role`) e escopo institucional (`uo`).

## 2. O Fluxo de Autenticação (Passo a Passo)

A autenticação é dividida em duas etapas de API: **Geração de OTP** e **Validação/Emissão de Token**.

### Etapa A: Geração e Envio de OTP (`POST /api/auth`)
1. O frontend envia `{"action": "send_otp", "username": "usuario@fazenda.mg.gov.br"}`.
2. O backend consulta a tabela `usuarios` para confirmar se a pessoa tem permissão para usar o sistema (`ativo = TRUE`).
3. Se permitido, o backend gera um código numérico aleatório de 6 dígitos.
4. O backend insere (ou sobrescreve) o código na tabela `otp_sessions` atrelado àquele e-mail.
5. O backend realiza a integração com o serviço de mensageria configurado para encaminhar o código gerado ao e-mail do usuário.

### Etapa B: Validação e Emissão do JWT (`POST /api/auth`)
1. O usuário digita o código na tela de login, e o frontend envia `{"action": "validate_otp", "username": "...", "otp_code": "..."}`.
2. O backend vai até a tabela `otp_sessions` e verifica se:
   - O código bate com o usuário.
   - O código não expirou.
   - O código ainda não foi `usado`.
3. Se válido, o código é marcado como `usado = TRUE`.
4. O backend consulta a tabela `usuarios` para pegar a função (`role`) e a Unidade Orçamentária (`uo`) do usuário.
5. O backend usa a biblioteca `jose` para **assinar criptograficamente** um token JWT contendo `username`, `role` e `uo`.
6. O JWT é devolvido para o frontend.

## 3. Gestão de Sessão no Frontend

- O frontend guarda o JWT recebido no `sessionStorage`.
- A partir daí, **toda** requisição feita à nossa API carrega um cabeçalho HTTP de Autorização:
  ```http
  Authorization: Bearer eyJhbGci...
  ```
- O frontend recarrega a sessão ao iniciar, chamando a rota de verificação **`GET /api/auth/me`**, garantindo que se você atualizar a página do navegador (F5), ele não precise relogar, apenas revalidar a assinatura do JWT.

## 4. Middlewares de Proteção de Rota (Backend)

Para garantir que apenas usuários autenticados acessem os dados, o backend utiliza middlewares centralizados em `backend/lib/auth.js`:

- **`requireAuth(request)`**: 
  - Valida a presença e a assinatura do token Bearer no cabeçalho `Authorization`.
  - Verifica se o usuário ainda está ativo na tabela `usuarios`.
  - Retorna um objeto contendo `user` (username/email), `role`, `uo` e o corpo da requisição já processado (`body`).
  - **Impacto:** A identidade do usuário é obtida exclusivamente do token assinado, nunca de parâmetros manuais.

- **`requireAdmin(request)`**:
  - Executa a lógica do `requireAuth`.
  - Adicionalmente, valida se a `role` retornada é `admin`.
  - Bloqueia o acesso com `403 Forbidden` caso o usuário não tenha privilégios administrativos.

**Padronização:** Nenhuma rota interna do sistema deve aceitar `user` ou `token` via Query String ou JSON body para fins de identificação. Isso evita falhas de segurança e garante que a sessão seja sempre validada criptograficamente.

## 5. Benefícios dessa Abordagem

1. **Stateless (Sem estado na API):** O backend não guarda sessões na memória. A validação é feita via descriptografia da assinatura do JWT, o que é escalável e eficiente.
2. **Segurança Centralizada:** O token JWT é validado em toda rota interna. Se o token for alterado ou expirar, o acesso é negado instantaneamente.
3. **Controle Total:** Sem depender de provedores externos, o administrador (role `admin`) pode gerenciar usuários e permissões diretamente no painel administrativo com efeito imediato nas validações do middleware.
4. **Simplificação do Frontend:** O `api.js` injeta o token automaticamente em todas as chamadas, permitindo que os scripts de página (`script.js`) foquem apenas na lógica de negócio, sem precisar gerenciar credenciais manualmente em cada chamada.
