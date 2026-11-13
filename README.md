# Escritório GoFluxo

Planta da equipe interna da GoFluxo: um ambiente por setor, avatares com nome e status, atalho direto a cada agente. Substitui a antiga Cidade GoFluxo no mesmo endereço de GitHub Pages.

Visual: planta vista de cima, fundo escuro com detalhes dourados, no tom do GoFluxo (roxo do Atlas). Sem prédios de conta e sem dados de cliente.

Toda métrica e atividade vem rotulada **dados de exemplo**. Os status reais ainda não existem — o arquivo `status.json` está pronto para cada agente gravar o próprio estado depois.

## Arquivos

| arquivo | função |
|---|---|
| `index.html` | página |
| `style.css` | visual |
| `app.js` | planta, busca, filtros, painel do agente, abertura |
| `status.json` | **única fonte de dados** — edite aqui para mudar o escritório |

Abra com um servidor local (`python3 -m http.server`) — o navegador precisa ler o JSON.

## Como um agente atualiza o status

1. Abra `status.json` e encontre o objeto em `agentes` pelo `id` (estável; não mude o `id` sem atualizar o `app.js` só se houver lógica específica — hoje o app lê qualquer agente do arquivo).
2. Atualize `status`, `agora`, `progresso`, `entregas` e, se for o caso, `aguardandoBreno`.
3. Acrescente uma linha em `eventos` (mais recente primeiro).
4. Ajuste `meta.atualizadoEm` (ISO 8601, fuso `America/Fortaleza`) e, se quiser, `escritorio.frase`.
5. Recarregue a página. Não é preciso editar HTML.

Quando o status deixar de ser simulação, tire `"exemplo": true` do item e, no fim, de `meta.exemplo`. A interface só esconde o selo “dados de exemplo” se `meta.exemplo` for `false` **e** o item também.

## Esquema de `status.json`

```
meta
  titulo, subtitulo          texto do cabeçalho
  exemplo                    true enquanto houver simulação
  rotuloExemplo              texto do selo (padrão: "dados de exemplo")
  atualizadoEm               ISO 8601 com fuso, ex. 2026-11-12T22:30:00-03:00
  fuso                       America/Fortaleza
  nota                       observação livre

escritorio
  frase                      resumo curto no cartão "Status do escritório"
  frentesAtivas              lista de setorId com frente aberta
  atualizadoPor              opcional, só para leitura humana

setores[]
  id                         chave estável (diretoria, conhecimento, …)
  nome                       nome do departamento (título da sala)
  sala                       subtítulo do ambiente
  cor                        hex do ambiente
  ordem                      posição na planta
  frente                     "ativa" ou omitido (aguardando)
  portao                     true no portão da Qualidade
  zonaExtra                  { id, nome } — subárea (ex.: laboratório)
  semAgentes                 true na sala de reunião

agentes[]
  id                         chave estável
  nome                       nome completo
  curto                      rótulo curto na planta (cabe em uma linha)
  iniciais                   duas letras no avatar
  cor                        hex do avatar
  setorId                    aponta para setores[].id
  zona                       opcional; "laboratorio" coloca o agente na subárea
  papel                      função
  status                     ver tabela abaixo
  agora                      o que está fazendo agora (frase honesta; se espera, diga isso)
  progresso                  { etapa, total, rotulo } ou null
  entregas[]                 { hora, texto } — mais recente primeiro; lista vazia se não houver
  aguardandoBreno            { titulo, texto, opcoes[] } ou null
  chatUrl                    link do chat (hoje é placeholder, ex. #chat/qualidade)
  exemplo                    true se o conteúdo ainda é simulação

eventos[]
  hora, agenteId, texto
  exemplo                    true se for simulação
  tipo                       entrega | aprovacao | handoff | info  (só visual)
```

### Valores de `status`

| valor | rótulo na planta | quando usar |
|---|---|---|
| `trabalhando` | Trabalhando | frente aberta, trabalho em curso |
| `aprovacao` | Aprovação | o agente espera uma decisão do Breno |
| `aguardando_frente` | Aguardando frente | configurado, a frente ainda não abriu — **não inventar trabalho** |
| `disponivel` | Disponível | frente aberta, sem tarefa no momento |
| `urgente` | Urgente | precisa de atenção imediata (não usar de enfeite) |
| `concluido` | Concluído | terminou a tarefa do dia e ainda não pegou outra |

Os KPIs do topo (integrantes, em atividade, aguardando frente, aguardando aprovação, urgente, concluídos hoje) são **calculados** a partir de `agentes` e `entregas`. Não há campo solto de métrica para não divergir.

## Convenção desta prévia

Frentes ativas de hoje: **Curadoria**, **Especificação** e **Qualidade**. Os outros oito especialistas (Marketing × 3, Comercial × 2, Processos e Entregas, Administração, Organização Pessoal), a Operação OpenBot e as ferramentas do laboratório estão em `aguardando_frente`, sem entregas inventadas.

## Atalhos da página

- `?preview=1` — pula a abertura (útil para captura de tela)
- Busca e filtros por setor levam direto ao agente na planta
- “Pular abertura”, e a abertura é desligada se o sistema pede menos movimento (`prefers-reduced-motion`)
