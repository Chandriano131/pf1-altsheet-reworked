/**
 * @file Declarações ambientes mínimas dos globais do Foundry VTT e do PF1E.
 *
 * O `checkJs` do jsconfig precisa conhecer esses nomes para tipar o nosso
 * código. Optamos por declarações `any` locais em vez da dependência
 * `foundry-vtt-types` (pesada, mantida pela comunidade e sem garantia de
 * alinhamento com o Foundry v13 + PF1E). A checagem de tipos vale para o
 * NOSSO código; a API do Foundry/PF1E é tratada como `any`.
 */

declare const game: any;
declare const canvas: any;
declare const ui: any;
declare const CONFIG: any;
declare const Hooks: any;
declare const foundry: any;
declare const Actor: any;
declare const Item: any;
declare const Handlebars: any;
declare const TextEditor: any;
declare const DocumentSheetConfig: any;
declare const pf1: any;

declare function fromUuid(uuid: string): Promise<any>;
declare function loadTemplates(paths: string[]): Promise<unknown>;

/** Objeto jQuery recebido em activateListeners (Application V1). */
type JQuery = any;

/** Sheet de personagem do sistema PF1E (`pf1.applications.actor.ActorSheetPFCharacter`). */
type ActorSheetPFCharacter = any;

/** Sheet de NPC do sistema PF1E (`pf1.applications.actor.ActorSheetPFNPC`). */
type ActorSheetPFNPC = any;
