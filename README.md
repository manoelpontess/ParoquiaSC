# 🎰 Bingão Paróquia Santa Cruz

Sistema completo de **gestão de mesas e reservas** para o Bingão da Paróquia Santa Cruz, Manaus. Desenvolvido com Next.js 16 + Supabase + Vercel.

🔗 **Acesso ao sistema:** [paroquiasc.vercel.app](https://paroquiasc.vercel.app)

---

## ✨ Funcionalidades

### 🗺️ Mapa de Mesas
- Visualização interativa do salão com **200 mesas** organizadas em 4 blocos (A, B, C, D)
- Cor diferenciada por status:
  - 🟢 **Verde** → Mesa livre (clicável)
  - 🟡 **Âmbar** → Mesa selecionada pelo operador
  - ⬛ **Cinza escuro com riscado** → Mesa vendida/reservada
- Seleção múltipla de mesas antes de confirmar a venda
- Atualização automática a cada 5 segundos (via polling + Supabase Realtime)

### 💰 Checkout de Venda
- Formulário de comprador com nome e telefone
- **Formas de pagamento**: Pix, Dinheiro, Débito, Crédito
- Geração automática de **QR Code Pix** com payload completo
- Cálculo automático do total (Valor/Mesa × Quantidade de mesas)
- Campo de **Valor/Mesa configurável** em tempo real (ex: R$ 50, R$ 100, etc.)
- Notificação automática via **WhatsApp** (OpenWA) ao comprador após confirmação

### 📋 Lista de Vendas
- Tabela de todas as mesas ocupadas (vendidas e reservadas)
- Status visual com badges coloridos (PAGO / RESERVADA)
- Valor pago por cada mesa individual
- Link direto para enviar **WhatsApp** ao comprador
- Botão **❌ Cancelar** para liberar a mesa de volta
- **📋 Exportar Lista**: gera uma página de impressão completa com todas as 200 mesas ordenadas de 1→200, com nome do comprador, telefone, localização no salão e status — ideal para **controle de entrada no dia do evento**

### 📊 Extrato Financeiro
- Cards de resumo por forma de pagamento:
  - 💰 Total Arrecadado
  - 💜 Pix
  - 💵 Dinheiro
  - 💳 Débito
  - 🔶 Crédito
- Tabela detalhada de cada venda com valor real pago por mesa
- Cálculo inteligente: se uma venda tem múltiplas mesas, divide o total igualmente
- Ordenado do mais recente para o mais antigo

### ⚙️ Configurações
- URL, chave de API e nome da sessão do **OpenWA** (WhatsApp)
- Nome do recebedor Pix e cidade (para o payload do QR Code)

---

## 🏗️ Arquitetura e Stack

| Tecnologia | Uso |
|---|---|
| **Next.js 16** (App Router) | Frontend + Server Actions |
| **Supabase** | Banco de dados PostgreSQL + Realtime |
| **Vercel** | Deploy contínuo |
| **OpenWA** | Envio de mensagens WhatsApp |
| **qrcode.react** | Geração de QR Code Pix |

---

## 🗄️ Banco de Dados (Supabase)

### Tabelas principais

#### `mesas`
| Coluna | Tipo | Descrição |
|---|---|---|
| `numero` | int | Número da mesa (1–200) |
| `setor` | text | Bloco no salão (A/B/C/D) |
| `preco` | numeric | Preço unitário |
| `status` | text | `livre` / `reservada` / `vendida` |
| `venda_id` | uuid | FK para a venda ativa |
| `reservado_em` | timestamptz | Data/hora da reserva |

#### `vendas`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid | Chave primária |
| `status` | text | `reservada` / `confirmada` |
| `total` | numeric | Valor total da venda |
| `forma_pagamento` | text | `pix` / `dinheiro` / `debito` / `credito` |

#### `compradores`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid | Chave primária |
| `nome` | text | Nome do comprador |
| `telefone` | text | Telefone com DDD |

### Funções RPC
- **`reservar_mesas(p_mesa_numeros, p_nome, p_telefone)`** — Cria comprador + venda + atualiza status das mesas atomicamente
- **`confirmar_pagamento(p_venda_id)`** — Marca a venda como confirmada/vendida

---

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── actions.ts          # Server Actions (Supabase com Service Role)
│   ├── globals.css         # Design system completo
│   ├── layout.tsx          # Metadados, viewport, favicon
│   ├── page.tsx            # Página principal e fluxo de venda
│   └── icon.png            # Favicon (cruz ✝️)
├── components/
│   ├── MapaMesas.tsx        # Mapa interativo das 200 mesas
│   ├── ModalComprador.tsx   # Modal: dados do comprador
│   ├── ModalPagamento.tsx   # Modal: forma de pagamento + Pix
│   ├── ModalSucesso.tsx     # Modal: confirmação de venda
│   ├── ListaVendas.tsx      # Lista de mesas ocupadas + exportação
│   ├── Dashboard.tsx        # Extrato financeiro por forma de pagamento
│   └── Configuracoes.tsx    # Configurações do sistema
├── hooks/
│   └── useMesasRealtime.ts  # Hook: polling + Supabase Realtime
└── lib/
    ├── pix.ts              # Gerador de payload Pix (EMVCo)
    ├── whatsapp.ts         # Formatação de número WhatsApp
    ├── openwa.ts           # Config e cliente OpenWA
    └── supabase/
        ├── client.ts       # Supabase client (browser)
        └── server.ts       # Supabase server
```

---

## 🚀 Configuração e Deploy

### Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenWA (WhatsApp) — opcional
OPENWA_URL=http://seu-servidor:3000
OPENWA_KEY=sua-chave-api
OPENWA_SESSION=nome-da-sessao
```

### Rodando localmente

```bash
npm install
npm run dev
```

### Deploy (Vercel)

```bash
npx vercel --prod
```

---

## 📱 Mobile

O sistema é totalmente responsivo:
- Scroll lateral no mapa de mesas com dica visual de gradiente
- Tabs com scroll horizontal
- Modais que sobem de baixo como "sheets" nativos
- Botões com touch targets mínimos de 44px (padrão Apple/Google)
- Tabela de vendas adaptada para telas pequenas

---

## ✝️ Desenvolvido para a Paróquia Santa Cruz — Manaus, AM
