/**
 * PF1E Alt Sheet Reworked — Classes de Sheet.
 *
 * Estende as sheets FormApplication do PF1E (ActorSheetPFCharacter / ActorSheetPFNPC),
 * substituindo o template e aplicando o estilo moderno do módulo.
 * Toda a lógica de dados (getData, _onX, listeners) é herdada do sistema PF1E.
 */

const MODULE_ID = "pf1-altsheet-reworked";
const M = `modules/${MODULE_ID}`;

// ─── ROLL ACTION BINDER ───────────────────────────────────────────────────────
// The parent sheet (ActorSheetPFCharacter/NPC) listens on specific CSS selectors
// (.ability-name, .attribute.initiative .rollable, etc.) that don't match our
// custom class names. We wire our data-action attributes here instead.

function _bindRollActions(sheet, html) {
  if (!sheet.isEditable) return;

  const actor = sheet.actor;
  const token = sheet.token;

  html.find('[data-action="rollAbility"]').on("click", e => {
    e.preventDefault();
    const ability = e.currentTarget.dataset.ability;
    actor.rollAbilityTest(ability, { token });
  });

  html.find('[data-action="rollSave"]').on("click", e => {
    e.preventDefault();
    const save = e.currentTarget.dataset.savingthrow;
    actor.rollSavingThrow(save, { token });
  });

  html.find('[data-action="rollInit"]').on("click", e => {
    e.preventDefault();
    actor.rollInitiative({ createCombatants: true, rerollInitiative: game.user.isGM, token });
  });

  html.find('[data-action="rollBAB"]').on("click", e => {
    e.preventDefault();
    actor.rollBAB({ token });
  });

  // CMB = maneuver attack (non-weapon)
  html.find('[data-action="rollCMB"]').on("click", e => {
    e.preventDefault();
    actor.rollAttack({ maneuver: true, ranged: false, token });
  });

  // Generic melee/ranged attack from combat stats header
  html.find('[data-action="rollGenericAttack"]').on("click", e => {
    e.preventDefault();
    const ranged = e.currentTarget.dataset.ranged === "true";
    actor.rollAttack({ maneuver: false, ranged, token });
  });

  html.find('[data-action="rollSkill"]').on("click", e => {
    e.preventDefault();
    const skill = e.currentTarget.dataset.skill;
    const subSkill = e.currentTarget.dataset.subSkill || undefined;
    actor.rollSkill(skill, { subSkill, token });
  });
}

// ─── DARK MODE ────────────────────────────────────────────────────────────────
// A per-user (client-scoped) preference. The `pf1ar-dark` class is applied to
// the outer application element so both .window-content and the form pick up
// the dark variable overrides.

function _applyTheme(sheet) {
  const dark = game.settings.get(MODULE_ID, "darkMode");
  const root = sheet.element?.[0];
  if (root) root.classList.toggle("pf1ar-dark", !!dark);
}

function _bindThemeToggle(sheet, html) {
  html.find('[data-action="pf1arToggleTheme"]').on("click", async e => {
    e.preventDefault();
    const next = !game.settings.get(MODULE_ID, "darkMode");
    await game.settings.set(MODULE_ID, "darkMode", next);
    const root = sheet.element?.[0];
    if (root) root.classList.toggle("pf1ar-dark", next);
    const icon = e.currentTarget.querySelector("i");
    if (icon) icon.className = `fa-solid ${next ? "fa-sun" : "fa-moon"}`;
  });
}

// ─── CHARACTER SHEET ──────────────────────────────────────────────────────────

export class AltCharacterSheetPF extends pf1.applications.actor.ActorSheetPFCharacter {
  /** @override */
  get template() {
    if (!game.user.isGM && this.actor.limited) {
      return "systems/pf1/templates/actors/limited-sheet.hbs";
    }
    return `${M}/templates/character-sheet.hbs`;
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["pf1-altsheet-reworked", "pf1ar-sheet", "sheet", "actor", "character"],
      width: 1005,
      height: 1029,
      scrollY: [
        ".primary-body > .tab",
        ".attacks-body",
        ".inventory-body",
        ".feats-body",
        ".buffs-body",
        ".skillset-body",
      ],
      tabs: [
        {
          navSelector: "nav.tabs[data-group='primary']",
          contentSelector: "section.primary-body",
          initial: "summary",
          group: "primary",
        },
        {
          navSelector: "nav.tabs[data-group='skillset']",
          contentSelector: "section.skillset-body",
          initial: "adventure",
          group: "skills",
        },
        {
          navSelector: "nav.tabs[data-group='spellbooks']",
          contentSelector: "section.spellbooks-body",
          initial: "primary",
          group: "spellbooks",
        },
      ],
    });
  }

  /** @override */
  async getData(options) {
    const data = await super.getData(options);
    data.moduleId = MODULE_ID;
    data.pf1arDark = game.settings.get(MODULE_ID, "darkMode");
    return data;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    _applyTheme(this);
    _bindThemeToggle(this, html);
    _bindRollActions(this, html);
  }
}

// ─── NPC SHEET ────────────────────────────────────────────────────────────────

export class AltNPCSheetPF extends pf1.applications.actor.ActorSheetPFNPC {
  /** @override */
  get template() {
    if (!game.user.isGM && this.actor.limited) {
      return "systems/pf1/templates/actors/limited-sheet.hbs";
    }
    return `${M}/templates/npc-sheet.hbs`;
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["pf1-altsheet-reworked", "pf1ar-sheet", "pf1ar-npc", "sheet", "actor", "npc"],
      width: 1005,
      height: 1029,
      scrollY: [
        ".primary-body > .tab",
        ".attacks-body",
        ".inventory-body",
        ".feats-body",
        ".buffs-body",
        ".skillset-body",
      ],
      tabs: [
        {
          navSelector: "nav.tabs[data-group='primary']",
          contentSelector: "section.primary-body",
          initial: "summary",
          group: "primary",
        },
        {
          navSelector: "nav.tabs[data-group='skillset']",
          contentSelector: "section.skillset-body",
          initial: "adventure",
          group: "skills",
        },
        {
          navSelector: "nav.tabs[data-group='spellbooks']",
          contentSelector: "section.spellbooks-body",
          initial: "primary",
          group: "spellbooks",
        },
      ],
    });
  }

  /** @override */
  async getData(options) {
    const data = await super.getData(options);
    data.moduleId = MODULE_ID;
    data.pf1arDark = game.settings.get(MODULE_ID, "darkMode");
    return data;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    _applyTheme(this);
    _bindThemeToggle(this, html);
    _bindRollActions(this, html);
  }
}
