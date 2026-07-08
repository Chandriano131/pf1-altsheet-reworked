/**
 * @file Configuração do ESLint (flat config) do módulo.
 *
 * `_pf1eSystem/` é a distribuição compilada do sistema (sem configs de lint
 * para espelhar), então esta config foi escrita do zero seguindo
 * `docs/convencoes-de-codigo.md`: JavaScript + JSDoc, Prettier cuidando da
 * formatação (via eslint-config-prettier) e globais do Foundry declarados
 * aqui em vez de importados.
 */

import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import jsdoc from "eslint-plugin-jsdoc";
import globals from "globals";

/**
 * Globais expostos pelo Foundry VTT e pelo sistema PF1E em runtime.
 * Não se importam — o Foundry os injeta no escopo global do navegador.
 * @type {Record<string, "readonly">}
 */
const foundryGlobals = {
  game: "readonly",
  canvas: "readonly",
  ui: "readonly",
  CONFIG: "readonly",
  Hooks: "readonly",
  foundry: "readonly",
  Actor: "readonly",
  Item: "readonly",
  Handlebars: "readonly",
  TextEditor: "readonly",
  DocumentSheetConfig: "readonly",
  fromUuid: "readonly",
  loadTemplates: "readonly",
  // Sistema Pathfinder 1e (namespace público do sistema)
  pf1: "readonly",
};

export default [
  {
    // Pastas de referência (read-only) e material de desenvolvimento não são lintados.
    ignores: ["_pf1eSystem/", "_baseModule/", "_design/", "module-integration/", "node_modules/", "dist/"],
  },
  js.configs.recommended,
  importPlugin.flatConfigs.recommended,
  jsdoc.configs["flat/recommended"],
  prettier,
  {
    files: ["scripts/**/*.mjs", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...foundryGlobals,
      },
    },
    settings: {
      jsdoc: { mode: "typescript" },
    },
    rules: {
      // Estilo (convenções): const por padrão, igualdade estrita, sem console.log esquecido.
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: "error",
      "no-console": ["warn", { allow: ["info", "warn", "error"] }],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],

      // Imports: ordenados por grupo e sem ciclos (política de includes).
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index", "type"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-cycle": "error",

      // JSDoc obrigatório em toda função/método/classe (política de documentação).
      "jsdoc/require-jsdoc": [
        "error",
        {
          require: {
            FunctionDeclaration: true,
            ClassDeclaration: true,
            MethodDefinition: true,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
        },
      ],
      "jsdoc/require-description": "error",
      // Métodos @inheritdoc herdam a assinatura documentada da classe base do PF1E.
      "jsdoc/require-param": ["error", { exemptedBy: ["override", "inheritdoc"] }],
      "jsdoc/require-returns": ["error", { exemptedBy: ["override", "inheritdoc"] }],
      // Descrição sem linha em branco antes das tags (estilo compacto).
      "jsdoc/tag-lines": ["warn", "never", { startLines: 0 }],
      // Tipos do Foundry/PF1E vêm de types/foundry.d.ts (aliases `any`), que o
      // plugin do ESLint não lê — declare-os aqui para o no-undefined-types.
      "jsdoc/no-undefined-types": [
        "warn",
        { definedTypes: ["JQuery", "ActorSheetPFCharacter", "ActorSheetPFNPC", "DragEvent"] },
      ],
    },
  },
];
