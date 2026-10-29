# ⚡ QuizPulse — Plataforma Gamificada de Treinamento & Desafio (GrupoBR BRCALL)

Plataforma gamificada em tempo real para treinamentos e desafios corporativos, desenvolvida para proporcionar alto engajamento, ranking ao vivo entre colaboradores e persistência de dados permanente.

![Demonstração QuizPulse](https://grupobrcall.com/wp-content/uploads/2022/09/grupobrcall.png)

---

## 🚀 Principais Funcionalidades

- **⏱️ Temporizador Regressivo Inteligente**: 15 segundos por pergunta com cálculo dinâmico de pontuação por velocidade.
- **🔥 Sistema de Streak & Multiplicadores**: Bonificação por sequências de acertos (1.2x a 1.5x no combo).
- **👥 Participantes Ao Vivo**: Visualização em tempo real de quem está respondendo o quiz no momento (avatar, questão atual e tempo).
- **🏆 Ranking Geral em Tempo Real**: Atualização instantânea dos melhores colocados com precisão e pontuação.
- **🛡️ Painel Administrativo do Gestor**: Métricas consolidadas, total de participantes, média de acerto, maior pontuação e exportação para CSV.
- **🔊 Efeitos Sonoros Arcade**: Sons sintetizados via Web Audio API (sem dependência de arquivos externos).
- **⌨️ Acessibilidade por Teclado**: Suporte a teclas numéricas `1-4`, letras `A-D` e `Enter` para avançar perguntas.
- **🎉 Celebração com Confetes**: Animação comemorativa ao finalizar o desafio.

---

## 🗄️ Banco de Dados Antiperda por Inatividade

Um dos maiores problemas em projetos gratuitos (como o Supabase Free) é que **o banco entra em pausa após 7 dias de inatividade**, impedindo os colaboradores de acessar os dados.

Para resolver isso de forma definitiva, esta plataforma conta com uma **arquitetura de tripla camada de persistência**:

1. **Google Firebase Realtime Database / Firestore (Recomendado)**:
   - Plano Spark gratuito do Google Cloud.
   - **NUNCA pausa nem apaga o banco por inatividade**.
   - Conexão em tempo real nativa via WebSockets.
2. **Supabase / PostgreSQL com Keep-Alive Automatizado**:
   - Inclui o arquivo `schema.sql` pronto para execução.
   - Inclui a rotina do GitHub Actions (`.github/workflows/keep-alive.yml`) que envia um ping automático a cada 3 dias, **impedindo o Supabase de entrar em modo de suspensão/inatividade**.
3. **Fallback Resiliente na Nuvem**:
   - Funciona imediatamente out-of-the-box mesmo sem chaves adicionais, com sincronização em nuvem e cache local offline-first.

---

## 🛠️ Tecnologias Utilizadas

- **React 18** + **TypeScript**
- **Vite** para compilação ultrarrápida
- **Tailwind CSS** para estilização moderna e responsiva
- **Lucide Icons** para iconografia
- **Canvas Confetti** para efeitos visuais

---

## 📦 Como Rodar Localmente

```bash
# 1. Instalar as dependências
npm install

# 2. Iniciar o servidor de desenvolvimento
npm run dev

# 3. Compilar para produção
npm run build
```

---

## 🌐 Deploy no Vercel

O projeto já contém o arquivo `vercel.json` configurado.

Para conectar ao Vercel:
1. Acesse [vercel.com](https://vercel.com).
2. Clique em **Add New...** -> **Project**.
3. Selecione o repositório `quizpulse-gamified-platform`.
4. O Vercel detectará automaticamente o Vite. Clique em **Deploy**.

---

## 🔒 Credenciais Padrão do Painel Admin

- **Usuário**: `Admin`
- **Senha**: `Admin123` (configurável pela variável `VITE_ADMIN_PASSWORD`)
