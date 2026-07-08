# Arquitetura do módulo

> **PF1 Alt Sheet Reworked** — ficha alternativa moderna para atores do sistema
> **Pathfinder 1e (PF1E)** no **Foundry VTT v13**. Este documento explica o que o
> módulo faz, como está organizado e, para cada parte, **o que ela chama no
> Foundry / PF1E**.

## Visão geral

O módulo registra duas sheets alternativas (PC e NPC) que **estendem as sheets
do próprio sistema PF1E** — toda a preparação de dados, rolagens e regras vêm do
sistema; o módulo troca o template, o CSS e adiciona alguns comportamentos
próprios (tema, contêineres inline, bindings de rolagem). É deliberadamente uma
camada fina: quanto menos lógica duplicada do sistema, menos coisa quebra quando
o PF1E atualiza.

**Ponto importante:** a ficha é **Application V1** (`FormApplication` →
`ActorSheet` → `ActorSheetPF*` do sistema), não ApplicationV2. O PF1E 11.x ainda
usa V1 para as sheets de ator; o visual imita o ApplicationV2 do Foundry v13,
mas o wiring (`getData`, `activateListeners`, `defaultOptions`) é V1.

## Mapa de arquivos

```text
module.json                      # manifesto (esmodules, styles, languages, relationship pf1)
scripts/
├─ main.mjs                      # ponto de entrada: hooks init/ready, settings, templates
├─ sheet.mjs                     # classes AltCharacterSheetPF / AltNPCSheetPF + bindings
└─ helpers.mjs                   # helpers Handlebars pf1ar_* (apresentação)
styles/
└─ pf1-altsheet-reworked.css     # CSS único: tokens, layout, componentes, dark, temas
templates/
├─ character-sheet.hbs           # shell da ficha de PC (header + nav + abas)
├─ npc-sheet.hbs                 # shell da ficha de NPC
└─ parts/*.hbs                   # uma parte por aba (summary, combat, inventory, …)
lang/
├─ en.json · pt-BR.json          # i18n, namespace PF1AR
types/foundry.d.ts               # declarações `any` dos globais p/ o checkJs (dev only)
docs/                            # este documento, convenções e contexto de decisões
```

## `scripts/main.mjs` — bootstrap

| O quê | Chamada no Foundry/PF1E | Por quê |
| --- | --- | --- |
| Guard de sistema | `game.system.id !== "pf1"` | módulo só faz sentido no PF1E |
| Helpers Handlebars | `Handlebars.registerHelper` (via `helpers.mjs`) | no `init`, antes de qualquer render |
| Settings | `game.settings.register(MODULE_ID, …)` | todas `scope: "client"` — preferências por usuário |
| Templates | `loadTemplates([...])` | pré-compila os `.hbs` das partes |
| Registro das sheets | `DocumentSheetConfig.registerSheet(Actor, …)` + `updateDefaultSheets()` | **no hook `ready`**, não no `init`: as classes `pf1.applications.actor.*` do sistema ainda não existem no `init` |

Settings registradas (todas client-scoped; o `onChange` re-renderiza as fichas
abertas — padrão App V1, sem reactive state):

- `darkMode` (Boolean, `config: false` — a UI é o botão sol/lua no cabeçalho);
- `theme` (String: `parchment` | `hybrid` | `slate`);
- `compact` (Boolean — densidade reduzida);
- `summarySkills` (String: `ranked` | `class` | `all` — filtro de perícias do resumo).

## `scripts/sheet.mjs` — as sheets

### Classes e registro

`AltCharacterSheetPF extends pf1.applications.actor.ActorSheetPFCharacter` e
`AltNPCSheetPF extends pf1.applications.actor.ActorSheetPFNPC`. Cada classe
sobrescreve apenas:

- **`get template`** — aponta para os `.hbs` do módulo; para permissão
  "limited" devolve a `limited-sheet.hbs` do próprio sistema (mesmo
  comportamento da sheet original).
- **`static defaultOptions`** — via `foundry.utils.mergeObject(super.defaultOptions, …)`:
  classes CSS (`pf1ar-sheet` etc.), dimensões, `scrollY` e a config de abas.
- **`getData`** — chama `super.getData()` (todo o contexto do sistema) e
  acrescenta: `pf1arDark`, `summarySkillsMode` e os render models de contêiner.
- **`activateListeners`** — chama `super.activateListeners(html)` (listeners do
  sistema) e liga os bindings do módulo.

### Ciclo das abas (FormApplication)

`defaultOptions.tabs` define três grupos:

| grupo | navSelector | contentSelector | initial |
| --- | --- | --- | --- |
| `primary` | `nav.tabs[data-group='primary']` | `section.primary-body` | `summary` |
| `skills` | `nav.tabs[data-group='skillset']` | `section.skillset-body` | `adventure` |
| `spellbooks` | `nav.tabs[data-group='spellbooks']` | `section.spellbooks-body` | `primary` |

O Foundry instancia um `Tabs` por grupo e, no `activateListeners` da classe
base, faz `this._tabs.forEach(t => t.bind(html[0]))` — é ele quem adiciona e
remove `.active` nos `.item` da nav e nos `.tab` do conteúdo. O módulo não
gerencia abas manualmente; só garante que os seletores do template batam com a
config.

### Rolagens (`_bindRollActions`)

A sheet-pai escuta seletores CSS do template do sistema (`.ability-name`,
`.attribute.initiative .rollable`, `.saving-throw .rollable`…), que não existem
no nosso template. Em vez de imitar essas classes, os templates usam
`data-action="rollX"` e o `_bindRollActions` mapeia cada um para o método do
Actor PF1E:

| `data-action` | Método do Actor | Observação |
| --- | --- | --- |
| `rollAbility` | `actor.rollAbilityTest(ability, { token })` | `data-ability` |
| `rollSave` | `actor.rollSavingThrow(save, { token })` | `data-savingthrow` |
| `rollInit` | `actor.rollInitiative({ createCombatants: true, … })` | GM re-rola |
| `rollBAB` | `actor.rollBAB({ token })` | |
| `rollCMB` | `actor.rollAttack({ maneuver: true, ranged: false })` | manobra de combate |
| `rollGenericAttack` | `actor.rollAttack({ maneuver: false, ranged })` | `data-ranged` |
| `rollSkill` | `actor.rollSkill(skill, { subSkill, token })` | `data-skill` / `data-sub-skill` |

### Contêineres inline

O PF1E guarda itens de contêiner **no próprio item** (`container.system.items`,
exposto como `container.items` — uma `Collection`), não como embedded items do
Actor. Por isso os controles padrão da sheet não os alcançam, e o módulo tem um
subsistema próprio:

- `_prepareContainerContents` monta um render model por contêiner reutilizando
  a infraestrutura de seções da sheet do sistema (`pf1.config.sheetSections.inventory`,
  `sheet._prepareSection/_prepareItem/_applySectionFilter/_prepareItemForSection`)
  e o formatador de moeda (`pf1.utils.currency.split/merge`,
  `container.getValue()`). Contêiner vazio ainda retorna objeto (`count: 0`)
  para renderizar o dropzone "arraste itens aqui".
- O estado aberto/fechado de cada `<details>` vive em
  `sheet._pf1arOpenContainers` (um `Set` na instância), porque o App V1 recria o
  DOM inteiro a cada render.
- Drag-and-drop: `TextEditor.getDragEventData`, `Item.implementation.fromDropData`,
  `game.items.fromCompendium`, `container.createContainerContent/deleteContainerContent`
  e o prompt `pf1.documents.item.ItemSpellPF.toConsumablePrompt` (magia →
  consumível, fluxo padrão do sistema).
- Os controles das linhas filhas usam `data-action="pf1arContained*"` (card,
  usar, editar, quantidade, identificar, duplicar, retirar, excluir, usos) e
  chamam os métodos do documento do item (`item.use`, `item.displayCard`,
  `item.update`, `item.sheet.render`…). A exclusão confirma via
  `foundry.applications.api.DialogV2.confirm`.

### Tema / dark / compacto (`_applyTheme`)

Chamada em todo `activateListeners`: alterna na raiz da aplicação
(`sheet.element[0]`, o elemento externo da janela) as classes `pf1ar-dark`,
`pf1ar-theme-{parchment|hybrid|slate}` e `pf1ar-compact`, lendo as settings. Os
botões do cabeçalho (`pf1arToggleTheme` sol/lua, `pf1arCycleTheme` paleta)
gravam a setting; o `onChange` re-renderiza as fichas abertas.

## Fluxo de dados

```text
actor.system  ──(getData do sistema PF1E)──►  contexto do template
                                              ├─ system.*, abilities, skills, inventory…
                                              └─ + extras do módulo (getData override):
                                                 pf1arDark, summarySkillsMode,
                                                 item.pf1arIsContainer / item.pf1arContents
                        ──(renderTemplate)──►  templates/*.hbs (+ parts/)
                        ──(edição)──────────►  inputs name="system.x.y" → _updateObject
                                               da FormApplication → actor.update()
```

Os templates são **auto-contidos**: não usam partials do sistema
(`{{> "systems/pf1/…"}}`), que mudam entre versões do PF1E e quebravam no
11.11. Helpers do módulo (`pf1ar_*`) são só de apresentação (sinal de
modificador, localização defensiva, dano de atributo).

## Sistema de CSS

- **Escopo:** todo o CSS vive sob `.pf1ar-root` (a `<form>`) e `.pf1ar-sheet`
  (a janela) — o CSS do sistema (`.pf1.sheet …`) não interfere, e o nosso não
  vaza para fora.
- **Tokens:** variáveis `--pf1ar-*` (superfícies, linhas, tintas, acentos,
  semânticos como `--pf1ar-heal`/`--pf1ar-drop`) definidas em `.pf1ar-sheet`.
  Componentes só consomem tokens; cores literais são exceção justificada.
- **Dark mode:** a classe `pf1ar-dark` na raiz sobrescreve os tokens (bloco
  `DARK MODE`). É aplicada via JS (`_applyTheme`) — não usa
  `prefers-color-scheme`, porque é uma preferência por usuário do Foundry.
- **Temas:** `pf1ar-theme-hybrid` e `pf1ar-theme-slate` sobrescrevem os mesmos
  tokens (bloco `THEME VARIANTS`); Parchment é o conjunto base, sem classe
  própria. Cada tema combina com `pf1ar-dark`.
- **Compacto:** `pf1ar-compact` reduz alturas/paddings de inventário e
  contêiner.
- As colunas das tabelas de inventário/contêiner são variáveis
  (`--pf1ar-inv-columns`, `--pf1ar-contained-columns`) compartilhadas entre
  header e linhas — para mudar colunas, edite só a variável.

## Limitações conhecidas

- **Acoplamento a métodos privados da sheet do PF1E:** o subsistema de
  contêineres chama `_prepareSection`/`_prepareItem`/`_applySectionFilter`/
  `_prepareItemForSection` (privados por convenção). Uma atualização do PF1E
  pode renomeá-los — é o ponto mais frágil do módulo e o primeiro lugar a
  checar quando o sistema atualizar.
- **Permissão "limited"** usa o template do sistema
  (`systems/pf1/templates/actors/limited-sheet.hbs`) — único template do
  sistema referenciado diretamente.
- **Strings fixas em inglês** em dois avisos de contêiner
  (`"This item cannot be placed inside itself."`,
  `"Only physical items can be placed inside a container."`) — pendência
  conhecida de i18n.
- **App V1:** quando o PF1E migrar as sheets para ApplicationV2 (Foundry v14+),
  o wiring (`getData`/`activateListeners`/`defaultOptions.tabs`) terá de ser
  revisto. Fora do escopo atual (alvo é v13).

## Tooling (dev)

`npm run lint` (ESLint flat config + `eslint-plugin-jsdoc` + `eslint-plugin-import`
+ Prettier via `eslint-config-prettier`), `npm run typecheck` (`tsc` com
`checkJs` sobre JSDoc; globais do Foundry declarados como `any` em
`types/foundry.d.ts`), `npm run format`. Nada disso é dependência de runtime —
o módulo empacotado continua sendo só `scripts/ + styles/ + templates/ + lang/ +
module.json`.
