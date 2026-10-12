# 🎟️ Passeio Paroquial

Sistema moderno de **controle e gestão da venda de 50 mesas** para o Passeio Paroquial, Manaus.

---

## ✨ Funcionalidades

### 🪑 Controle de 50 Mesas (1 a 50)
- Grade limpa e objetiva com as 50 mesas numeradas de **01 a 50**.
- Status visual em tempo real:
  - ⚪ **Livre** — Toque para selecionar uma ou mais mesas simultaneamente.
  - 🟣 **Selecionada** — Destaque com barra flutuante de checkout mostrando total e botão de venda.
  - 🟡 **Reservada** — Mesa reservada aguardando confirmação de pagamento.
  - 🟢 **Vendida** — Mesa com pagamento confirmado.
- Busca rápida por número da mesa, nome do comprador ou responsável.
- Filtros rápidos por status (Todas, Livres, Reservadas, Vendidas).

### 💰 Checkout Rápido & Pagamento Pix
- Formulário ágil: nome do comprador, telefone (opcional) e pessoa responsável pela venda.
- **Formas de pagamento**: Pix, Dinheiro, Débito, Crédito e opção **"Pagar depois"** (para reservas).
- **Chave Pix (CPF)**: Configurada para `445.390.022-87` com geração automática de QR Code e código Copia e Cola no padrão oficial do Banco Central (EMVCo).
- Valor padrão: **R$ 15,00** por mesa (ajustável no sistema).

### 📋 Controle de Vendas & Ações Rápidas
- Tabela com todas as mesas ocupadas, compradores, responsáveis e status.
- Botão **✅ Confirmar** direto na tabela para reservas pagas posteriormente.
- Edição dos dados do comprador e do responsável a qualquer momento.
- Botão para **Liberar Mesa** com confirmação de segurança.
- **📄 Imprimir Comprovante**: recibo pronto para impressão ou PDF.
- **📋 Imprimir / Salvar PDF da Lista**: folha de controle completa com opção de caixas de marcação (check-in/presença) no dia do evento.

### 📊 Extrato Financeiro
- Indicadores em tempo real:
  - 💰 Total Arrecadado (mesas pagas)
  - ⏳ Total a Receber (mesas reservadas)
  - 💜 Pix | 💵 Dinheiro | 💳 Débito | 🔶 Crédito
- Ranking de vendas por **Pessoa / Responsável** com barras de progresso.
- Feed com o histórico das confirmações mais recentes.

### ⚙️ Configurações & Gestão de Pessoas
- **Geral & Pix**: ajuste do valor da mesa (R$ 15,00), chave Pix (CPF), nome do recebedor e cidade.
- **Pessoas / Responsáveis**: aba dedicada para cadastrar as pessoas que vendem ou cuidam das mesas, eliminando o antigo campo de áreas missionárias e permitindo selecionar o vendedor no momento da reserva.

---

## 🗄️ Banco de Dados (Supabase)

O script completo e idempotente está localizado em [`supabase/schema.sql`](file:///Users/manoelpontes/Projetos/ParoquiaSC/supabase/schema.sql).

### Como criar o banco novo:
1. No [Supabase](https://supabase.com), crie um novo projeto.
2. Acesse o **SQL Editor** → **New query**.
3. Copie o conteúdo de `supabase/schema.sql` e execute (**Run**).
4. No arquivo `.env.local`, preencha as variáveis:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

---

## 🚀 Como Executar Localmente

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## ✝️ Passeio Paroquial — Manaus, AM
