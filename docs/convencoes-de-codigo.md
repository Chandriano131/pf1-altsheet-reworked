# Convenções de código

> **Nota de adaptação.** As convenções originais foram escritas com nomes de pasta
> genéricos (`_system/pf2e`, `_system/`, `_modules/`, "pf1e (a base)"). Neste projeto os
> nomes reais são outros, então a referência ao "sistema gold-standard a espelhar" e à
> "base a estender" aponta para **`_pf1eSystem`** (o clone do sistema PF1E, que serve de
> referência de arquitetura e de integração) e **`_baseModule`** (o módulo antigo
> pf1-alt-sheet). Confira se `_pf1eSystem` é JavaScript ou TypeScript ao espelhar as
> configs; de todo modo, o **alvo do módulo é JavaScript + JSDoc**.

As três políticas a seguir são o padrão de código do projeto.

---

## Política do Ponytail — pense antes de escrever código

Antes de escrever qualquer função, classe ou módulo novo, passe por este checklist. A
regra de ouro: **o melhor código é o que você não precisa escrever.** Só escreva algo novo
quando as seis respostas justificarem.

1. **Esse código precisa mesmo existir?** O problema é real e atual, ou é especulação /
   over-engineering? Se ninguém precisa disso agora, não escreva.
2. **A biblioteca padrão do JS já faz isso?** (`Array`, `Object`, `Map`, `Set`, `Intl`,
   `structuredClone`, métodos de `String`, etc.)
3. **É um recurso nativo do Foundry?** Cheque a API do Foundry **ANTES de tudo**:
   `foundry.utils.*` (`deepClone`, `mergeObject`, `getProperty`, `setProperty`,
   `duplicate`, `randomID`, `expandObject`, `flattenObject`…), `Collection`, hooks,
   `DataModel`, etc. O Foundry resolve muita coisa que parece que você teria que
   implementar do zero.
4. **Já existe uma dependência instalada que resolve?** Olhe o `package.json` antes de
   adicionar qualquer coisa nova.
5. **Dá pra fazer em uma ou poucas linhas?** Se sim, faça inline em vez de criar uma
   abstração / utilitário novo.
6. **Não existe já um método ou objeto que faça isso?** Procure no código de
   `_pf1eSystem` (o sistema de referência) e em `_baseModule` — provavelmente o problema
   já foi resolvido em algum lugar.

Se a resposta a **2, 3, 4 ou 6** for "sim", **reutilize** em vez de reimplementar. Só crie
código novo quando nada acima cobrir o caso — e, então, o menor possível. Quando a decisão
não for óbvia, registre em `context.md` por que o código novo precisou existir.

---

## Política de includes / imports

Como o código é importado importa tanto quanto o código em si.

- **Menos é mais (herda do Ponytail):** não importe o que não usa; não adicione
  dependência que a biblioteca padrão ou a API do Foundry já cobrem.
- **Adicionar dependência nova é decisão consciente:** ela precisa passar antes pela
  Política do Ponytail, ter licença compatível e manutenção ativa. Justifique a inclusão
  em `context.md`. Prefira soluções sem dependência.
- **Imports explícitos e nomeados:** prefira `import { x } from '...'` a
  `import * as tudo from '...'`. Importe só o que usa.
- **Ordem e agrupamento** (via `eslint-plugin-import`): (1) built-ins / nativos,
  (2) dependências de terceiros, (3) módulos internos do projeto, (4) tipos — com linha em
  branco entre os grupos. Ordenação automática; ninguém ordena na mão.
- **Sem dependências circulares:** ative `import/no-cycle` no ESLint. Ciclo de import é
  sintoma de fronteira de módulo errada — conserte a fronteira, não force o import.
- **Respeite as fronteiras de módulo:** importe de um módulo pela sua entrada pública
  (ex.: o `index.js` dele), não alcançando arquivos internos.
- **Globais do Foundry não se importam:** `game`, `canvas`, `ui`, `CONFIG`, `Hooks` são
  globais (declarados no ESLint), não imports. Para utilitários, prefira o acesso
  namespaced `foundry.utils.*` (padrão do Foundry moderno) a helpers soltos ou duplicados.
- **ESM sempre:** o projeto usa ES Modules (`import`/`export`), nunca `require`.
- **Caminhos consistentes:** siga o padrão de caminhos do sistema base; se `_pf1eSystem`
  usa aliases de path, espelhe. Nada de `../../../..` frágil — se aparecer, é sinal de que
  a estrutura precisa de um alias ou de reorganização.

---

## Política de lint e documentação

Todo o código do projeto segue um padrão único de estilo e documentação, aplicado
automaticamente. A meta é código limpo, consistente e fácil de manipular: qualquer pessoa
deve conseguir ler uma função e entender o que ela faz sem decifrar a implementação.

### Ferramental (configurar espelhando `_pf1eSystem`)

- **ESLint** (flat config, `eslint.config.js`) — qualidade e consistência.
- **Prettier** — formatação automática; integrado via `eslint-config-prettier` para não
  conflitar com o ESLint.
- **eslint-plugin-jsdoc** — exige e valida a documentação JSDoc.
- **eslint-plugin-import** — ordena imports e barra dependências circulares.
- **jsconfig.json** com `"checkJs": true` — checagem de tipos a partir do JSDoc, dando
  segurança de tipo sem precisar migrar tudo para TypeScript.
- Examine primeiro as configs de `_pf1eSystem` e adapte-as. O alvo aqui é
  **JavaScript + JSDoc**.

### Estilo (ESLint + Prettier)

- `const` por padrão, nunca `var`; sem variáveis nem imports não usados.
- Igualdade estrita (`===`); sem código morto; sem `console.log` esquecido.
- Formatação 100% delegada ao Prettier (indentação, aspas, ponto e vírgula, largura de
  linha) — ninguém formata na mão.
- Declare os globais do Foundry (`game`, `canvas`, `ui`, `CONFIG`, `Hooks`, `foundry`,
  `Actor`, `Item`, etc.) na config do ESLint para evitar falsos positivos de "não
  definido".

### Documentação com JSDoc (obrigatória)

Toda função, método, classe e símbolo exportado deve ter bloco JSDoc — o
`eslint-plugin-jsdoc` reprova o que estiver sem. Cada bloco contém:

- **Descrição do propósito:** o que faz e por que existe.
- `@param {Tipo} nome` — descrição de cada parâmetro.
- `@returns {Tipo}` — quando houver retorno.
- `@typedef` / `@type` para estruturas de dados complexas, para o `checkJs` entender os
  tipos.
- No topo de cada arquivo, um comentário de visão geral (`@file` ou `@module`) dizendo qual
  é a responsabilidade daquele arquivo.

### Comentários no código

- Comente o **porquê**, não o **quê**. Código óbvio dispensa comentário; decisões não
  óbvias, workarounds e regras de negócio do Pathfinder, não.
- Ao portar uma mecânica do PF1E ou implementar uma regra do PF1, deixe um comentário curto
  citando a regra que está sendo implementada.

### Aplicação (definição de "concluído")

- Nenhuma tarefa está concluída enquanto o código não passar em **lint e typecheck sem
  erros** e não estiver **documentado com JSDoc**.
- Rode o lint ao final de cada tarefa. Se algo não puder ser resolvido na hora, registre a
  pendência em `context.md` em vez de deixar passar silenciosamente.
- (Recomendado) pre-commit hook com **Husky + lint-staged** rodando Prettier + ESLint
  apenas nos arquivos alterados, para manter o custo baixo.

---

## Convenções de trabalho

- Arquitetura robusta e organizada, espelhando os padrões de `_pf1eSystem` quando fizerem
  sentido. Prefira migração incremental a big-bang.
- Antes de escrever código, rode a Política do Ponytail (as 6 perguntas acima). O melhor
  código é o que não precisa existir.
- Não modifique nada em `_pf1eSystem/` ou `_baseModule/`. Só leitura e cópia.
- Trabalhe em passos pequenos e verificáveis; ao final de cada um, atualize a documentação
  e garanta lint/typecheck limpos e JSDoc completo.
- Ao encontrar ambiguidade ou uma decisão de arquitetura relevante, pare e pergunte em vez
  de assumir.
- Ao final de cada fase, faça um checkpoint: atualize os docs e dê um resumo antes de
  avançar.
