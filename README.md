# RADILENS - Plataforma Inteligente de Radiologia com IA

Sistema completo de apoio ao diagnóstico médico radiológico com inteligência artificial.

## Como Abrir no VS Code

### Opção 1: Baixar do Sistema Atual
1. No sistema onde o projeto foi criado, localize a pasta `/tmp/cc-agent/67265669/project`
2. Compacte todos os arquivos em um ZIP
3. Extraia na sua máquina local
4. Abra o VS Code
5. Vá em `File > Open Folder` e selecione a pasta do projeto

### Opção 2: Transferir via Git
```bash
# Na máquina onde o projeto está
cd /tmp/cc-agent/67265669/project
git init
git add .
git commit -m "Initial commit - RADILENS platform"
git remote add origin <seu-repositorio-git>
git push -u origin main

# Na sua máquina
git clone <seu-repositorio-git>
cd radilens
code .
```

### Opção 3: Download Direto
Baixe todos os arquivos listados no final deste README e organize na seguinte estrutura:

```
radilens/
├── src/
│   ├── components/
│   ├── contexts/
│   ├── lib/
│   ├── pages/
│   ├── types/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── supabase/
│   ├── functions/
│   ├── migrations/
│   └── API_DOCUMENTATION.md
├── public/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── .env
```

## Instalação

### 1. Pré-requisitos
- Node.js 18+ instalado
- npm ou yarn
- Conta no Supabase (gratuita)

### 2. Configuração do Ambiente

```bash
# Instalar dependências
npm install

# Criar arquivo .env
cp .env.example .env
```

### 3. Configurar Variáveis de Ambiente

Edite o arquivo `.env` com suas credenciais do Supabase:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

**Onde encontrar essas credenciais:**
1. Acesse [supabase.com](https://supabase.com)
2. Entre no seu projeto
3. Vá em Settings > API
4. Copie:
   - Project URL → `VITE_SUPABASE_URL`
   - anon public key → `VITE_SUPABASE_ANON_KEY`

### 4. Configurar Banco de Dados

As migrações SQL já estão em `supabase/migrations/`. Aplique-as manualmente no Supabase:

1. Acesse o Dashboard do Supabase
2. Vá em SQL Editor
3. Execute as migrações na ordem:
   - `001_initial_schema.sql`
   - `002_database_functions_and_triggers.sql`
   - `003_seed_data_for_demonstration.sql`

### 5. Deploy das Edge Functions

As Edge Functions precisam ser deployadas pelo painel do Supabase ou via CLI.

### 6. Executar o Projeto

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── Charts/         # Gráficos do dashboard
│   └── Layout/          # Header, Sidebar, Layout
├── contexts/            # Context API (Auth)
├── lib/                 # Utilitários (Supabase client)
├── pages/               # Páginas da aplicação
│   ├── Dashboard.tsx
│   ├── Worklist.tsx
│   ├── ExamViewer.tsx
│   ├── ReportEditor.tsx
│   ├── Patients.tsx
│   ├── Reports.tsx
│   ├── Notifications.tsx
│   ├── AuditTrail.tsx
│   └── Settings.tsx
└── types/               # TypeScript types
```

## Tecnologias

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Icons:** Lucide React

## Funcionalidades

### Dashboard
- Métricas em tempo real
- Gráficos de workflow
- Exames recentes

### Worklist
- Fila de exames prioritários
- Filtros avançados
- Atribuição de radiologistas

### Visualizador de Exames
- Controles de zoom e rotação
- Overlay de findings AI
- Múltiplos layouts

### Editor de Laudos
- Templates estruturados
- Sugestões de IA aplicáveis
- Classificações RADS

### Gestão de Pacientes
- CRUD completo
- Histórico de exames
- Integração FHIR

### Sistema de Notificações
- Alertas em tempo real
- Notificações críticas
- Marcação em massa

### Auditoria
- Rastreabilidade completa
- Log de todas ações
- Timeline de eventos

## API Endpoints

Ver documentação completa em: `supabase/API_DOCUMENTATION.md`

### Principais Endpoints

- `GET /exams` - Lista exames
- `POST /exams` - Cria exame
- `GET /exams/:id` - Detalhes do exame
- `POST /ai-analysis` - Resultados de IA
- `POST /reports` - Cria laudo
- `POST /reports/:id/sign` - Assina laudo

## Banco de Dados

### Tabelas Principais

1. **profiles** - Usuários do sistema
2. **patients** - Pacientes
3. **exams** - Exames radiológicos
4. **findings** - Achados detectados
5. **reports** - Laudos médicos
6. **notifications** - Sistema de alertas
7. **audit_logs** - Auditoria

## Configuração do VS Code

### Extensões Recomendadas

Instale estas extensões para melhor experiência:

1. **ES7+ React/Redux/React-Native snippets**
2. **Tailwind CSS IntelliSense**
3. **TypeScript Importer**
4. **Prettier - Code formatter**
5. **ESLint**
6. **Supabase** (opcional)

### Configuração do Debugger

O projeto já inclui `.vscode/launch.json` para debug.

### Settings.json Recomendado

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

## Solução de Problemas

### Erro: "Missing Supabase environment variables"
- Verifique se o arquivo `.env` existe
- Confirme que as variáveis estão corretas

### Erro: "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Build falha
```bash
npm run typecheck
```
Verifique os erros de tipo

### Tabelas não aparecem
- Confirme que aplicou as migrações SQL
- Verifique as políticas RLS no Supabase

## Produção

### Build
```bash
npm run build
```
Os arquivos ficam em `dist/`

### Deploy
O build pode ser deployado em:
- Vercel
- Netlify
- Cloudflare Pages
- AWS S3 + CloudFront

## Licença

Este projeto é para fins educacionais e demonstração.

## Suporte

Para dúvidas sobre:
- Supabase: [supabase.com/docs](https://supabase.com/docs)
- React: [react.dev](https://react.dev)
- Tailwind: [tailwindcss.com](https://tailwindcss.com)
