/**
 * PF1E Alt Sheet Reworked — Classes de Sheet.
 *
 * Estende as sheets FormApplication do PF1E (ActorSheetPFCharacter / ActorSheetPFNPC),
 * substituindo o template e aplicando o estilo moderno do módulo.
 * Toda a lógica de dados (getData, _onX, listeners) é herdada do sistema PF1E.
 */

const MODULE_ID = "pf1-altsheet-reworked";
const M = `modules/${MODULE_ID}`;

// ─── CONTAINER CONTENTS ──────────────────────────────────────────────────────
// PF1E stores items inside a container on the container item itself
// (`container.system.items`, prepared as `container.items`). Those contained
// items are not direct Actor embedded items, so the actor-sheet controls cannot
// operate on them directly. We prepare a compact, read/write render model here
// and bind dedicated controls below.

function _formatCurrencySplit(value) {
  return game.i18n.format("PF1.SplitValue", pf1.utils.currency.split(value, { pad: true }));
}

function _getOpenInlineContainers(sheet) {
  sheet._pf1arOpenContainers ??= new Set();
  return sheet._pf1arOpenContainers;
}

function _setInlineContainerOpen(sheet, containerId, open = true) {
  if (!containerId) return;
  const openContainers = _getOpenInlineContainers(sheet);
  if (open) openContainers.add(containerId);
  else openContainers.delete(containerId);
}

function _prepareContainerContents(sheet, container, context) {
  if (container?.type !== "container" || !container.items?.size) return null;

  const inventory = Object.values(pf1.config.sheetSections.inventory)
    .map((data) => foundry.utils.deepClone(data))
    .sort((a, b) => a.sort - b.sort);

  for (const section of inventory) {
    sheet._prepareSection(section);
  }

  const items = container.items
    .map((item) => sheet._prepareItem(item))
    .sort((a, b) => (a.sort || 0) - (b.sort || 0));

  for (const item of items) {
    const section = inventory.find((section) => sheet._applySectionFilter(item, section));
    if (!section) continue;

    sheet._prepareItemForSection(item, section, context);
    section.items ??= [];
    section.items.push(item);
  }

  const sections = inventory.filter((section) => section.items?.length);
  if (!sections.length) return null;

  const currency = container.system.currency ?? {};
  const coinage = pf1.utils.currency.merge(currency);
  const value =
    container.getValue({ recursive: true, sellValue: 1, inLowestDenomination: true }) -
    container.getValue({ recursive: false, sellValue: 1, inLowestDenomination: true }) -
    coinage;
  const sellValue =
    container.getValue({ recursive: true, inLowestDenomination: true }) -
    container.getValue({ recursive: false, inLowestDenomination: true }) -
    coinage;

  return {
    count: items.length,
    sections,
    weight: container.system.weight?.converted?.contents ?? 0,
    valueLabel: _formatCurrencySplit(value),
    sellValueLabel: _formatCurrencySplit(sellValue),
    currencyLabel: _formatCurrencySplit(coinage),
    hasCurrency: Object.values(currency).some((amount) => Number(amount) > 0),
    open: _getOpenInlineContainers(sheet).has(container.id),
  };
}

function _prepareInventoryContainers(sheet, data) {
  if (!Array.isArray(data.inventory)) return;

  for (const section of data.inventory) {
    for (const item of section.items ?? []) {
      const container = item.document;
      if (container?.type === "container") {
        item.pf1arIsContainer = true;
      }

      const contents = _prepareContainerContents(sheet, container, data);
      if (!contents) continue;

      item.pf1arContents = contents;
    }
  }
}

function _getContainedItemContext(sheet, element) {
  const row = element.closest("[data-container-id][data-contained-item-id]");
  if (!row) return {};

  const container = sheet.actor.items.get(row.dataset.containerId);
  const item = container?.items?.get(row.dataset.containedItemId);
  return { row, container, item };
}

function _rememberContainedContainerOpen(sheet, element) {
  const row = element.closest("[data-container-id]");
  _setInlineContainerOpen(sheet, row?.dataset.containerId, true);
}

function _getInlineContainerDropTarget(element) {
  return element.closest("[data-container-drop-id], .pf1ar-container-contents");
}

function _getInlineContainerDropId(element) {
  const target = _getInlineContainerDropTarget(element);
  return target?.dataset.containerDropId || target?.dataset.containerId;
}

function _onContainedItemDragStart(sheet, event) {
  const { container, item } = _getContainedItemContext(sheet, event.currentTarget);
  if (!container || !item) return;

  event.stopPropagation();
  event.stopImmediatePropagation?.();

  _setInlineContainerOpen(sheet, container.id, true);

  const dragData = {
    type: "Item",
    data: item.toObject(),
    containerId: container.id,
    itemId: item.id,
    actorUuid: sheet.actor?.uuid,
  };

  event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  event.dataTransfer.effectAllowed = "move";
}

async function _dropItemIntoInlineContainer(sheet, event) {
  event.preventDefault();
  event.stopPropagation();

  if (!sheet.isEditable || !sheet.actor?.isOwner) return;

  const containerId = _getInlineContainerDropId(event.target);
  const container = sheet.actor.items.get(containerId);
  if (!container || container.type !== "container") return;

  sheet.element?.[0]
    ?.querySelectorAll(".pf1ar-container-drop-hover")
    .forEach((el) => el.classList.remove("pf1ar-container-drop-hover"));
  _setInlineContainerOpen(sheet, container.id, true);

  const data = TextEditor.getDragEventData(event);
  if (data.type !== "Item") return;

  const droppedItem = await Item.implementation.fromDropData(data);
  if (!droppedItem) return;

  if (droppedItem === container || droppedItem === container.rootItem) {
    ui.notifications.warn("This item cannot be placed inside itself.");
    return;
  }

  let sourceActor = data.actorUuid ? await fromUuid(data.actorUuid) : null;
  sourceActor ??= droppedItem.actor;
  const sameActor = sourceActor === sheet.actor;

  if (sameActor && data.containerId === container.id) return;

  const itemData = game.items.fromCompendium(droppedItem, {
    clearFolder: true,
    keepId: sameActor,
    clearSort: !sameActor,
  });

  if (itemData.type === "spell" && pf1.documents?.item?.ItemSpellPF?.toConsumablePrompt) {
    const resultData = await pf1.documents.item.ItemSpellPF.toConsumablePrompt(itemData, {
      allowSpell: false,
      actor: sheet.actor,
    });
    if (resultData) return container.createContainerContent(resultData);
    return false;
  }

  if (!droppedItem.isPhysical) {
    ui.notifications.warn("Only physical items can be placed inside a container.");
    return;
  }

  const created = await container.createContainerContent(itemData);

  if (sameActor && created?.length) {
    if (data.containerId) {
      sourceActor.containerItems
        ?.find((item) => item.id === data.itemId && item.parentItem?.id === data.containerId)
        ?.parentItem.deleteContainerContent(data.itemId);
    } else {
      await sourceActor.items.get(droppedItem.id)?.delete();
    }
  }

  return created;
}

function _bindContainerContents(sheet, html) {
  const root = html[0];
  if (!root) return;

  root.querySelectorAll(".pf1ar-container-contents").forEach((el) => {
    el.addEventListener("click", (event) => event.stopPropagation());
    el.addEventListener("toggle", (event) => {
      const details = event.currentTarget;
      _setInlineContainerOpen(sheet, details.dataset.containerId, details.open);
    });
  });

  root.querySelectorAll("[data-container-drop-id], .pf1ar-container-contents").forEach((el) => {
    el.addEventListener("dragenter", (event) => {
      event.preventDefault();
      event.stopPropagation();
      el.classList.add("pf1ar-container-drop-hover");
    });
    el.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      el.classList.add("pf1ar-container-drop-hover");
    });
    el.addEventListener("dragleave", (event) => {
      if (!event.relatedTarget || !el.contains(event.relatedTarget)) {
        el.classList.remove("pf1ar-container-drop-hover");
      }
    });
    el.addEventListener("drop", (event) => _dropItemIntoInlineContainer(sheet, event));
  });

  root.querySelectorAll(".pf1ar-contained-row[draggable='true']").forEach((el) => {
    el.addEventListener("dragstart", (event) => _onContainedItemDragStart(sheet, event), { capture: true });
  });

  html.find('[data-action="pf1arContainedCard"]').on("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const { item } = _getContainedItemContext(sheet, event.currentTarget);
    return item?.displayCard();
  });

  html.find('[data-action="pf1arContainedAction"]').on("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const { item } = _getContainedItemContext(sheet, event.currentTarget);
    return item?.use({ ev: event });
  });

  html.find('[data-action="pf1arContainedEdit"]').on("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const { item } = _getContainedItemContext(sheet, event.currentTarget);
    return item?.sheet.render(true, { focus: true, editable: sheet.isEditable });
  });

  html.find('[data-action="pf1arContainedQuantity"]').on("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!sheet.isEditable) return;
    _rememberContainedContainerOpen(sheet, event.currentTarget);

    const { item } = _getContainedItemContext(sheet, event.currentTarget);
    if (!item) return;

    let delta = Number(event.currentTarget.dataset.delta) || 0;
    if (event.shiftKey) delta *= 5;
    if (event.ctrlKey) delta *= 10;

    const current = Number(item.system.quantity) || 0;
    let quantity = Math.max(0, current + delta);
    if (item.type === "container" && quantity > 1) quantity = 1;
    return item.update({ "system.quantity": quantity });
  });

  html.find('[data-action="pf1arContainedIdentify"]').on("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!game.user.isGM) return void ui.notifications.error(game.i18n.localize("PF1.Error.CantIdentify"));
    _rememberContainedContainerOpen(sheet, event.currentTarget);

    const { item } = _getContainedItemContext(sheet, event.currentTarget);
    if (!item || item.system.identified === undefined) return;
    return item.update({ "system.identified": !item.system.identified });
  });

  html.find('[data-action="pf1arContainedDuplicate"]').on("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!sheet.isEditable) return;
    _rememberContainedContainerOpen(sheet, event.currentTarget);

    const { container, item } = _getContainedItemContext(sheet, event.currentTarget);
    if (!container || !item) return;

    const itemData = item.toObject();
    delete itemData._id;
    delete itemData.system?.links?.children;
    delete itemData.system?.links?.charges;

    itemData._stats ??= {};
    itemData._stats.duplicateSource ||= item.uuid;
    itemData.name = `${itemData.name} (${game.i18n.localize("PF1.Copy")})`;
    if (item.isPhysical && !item.system.identified) {
      itemData.system.unidentified ??= {};
      itemData.system.unidentified.name = `${item.system.unidentified?.name ?? item.name} (${game.i18n.localize(
        "PF1.Copy"
      )})`;
    }

    return container.createContainerContent(itemData);
  });

  html.find('[data-action="pf1arContainedTake"]').on("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!sheet.isEditable) return;
    _rememberContainedContainerOpen(sheet, event.currentTarget);

    const { container, item } = _getContainedItemContext(sheet, event.currentTarget);
    if (!container || !item) return;

    const created = await Item.implementation.create(item.toObject(), { parent: sheet.actor });
    if (created) return container.deleteContainerContent(item.id);
  });

  html.find('[data-action="pf1arContainedDelete"]').on("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!sheet.isEditable) return;
    _rememberContainedContainerOpen(sheet, event.currentTarget);

    const { container, item } = _getContainedItemContext(sheet, event.currentTarget);
    if (!container || !item) return;

    const confirm = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.format("PF1.DeleteItemTitle", { name: item.name }), icon: "fa-solid fa-trash" },
      classes: ["pf1-v2", "delete-item"],
      content: `<p>${game.i18n.localize("PF1.DeleteItemConfirmation")}</p>`,
      rejectClose: false,
      modal: true,
    });

    if (confirm) return container.deleteContainerContent(item.id);
  });

  html.find(".pf1ar-contained-uses-input").on("change wheel", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!sheet.isEditable) return;
    _rememberContainedContainerOpen(sheet, event.currentTarget);

    const input = event.currentTarget;
    const { item } = _getContainedItemContext(sheet, input);
    if (!item) return;

    if (event.originalEvent instanceof WheelEvent) {
      const current = Number(input.value);
      if (!Number.isFinite(current)) return;
      const step = Number(input.dataset.wheelStep) || 1;
      input.value = current + step * -Math.sign(event.originalEvent.deltaY);
    }

    const value = Number(input.value);
    if (!Number.isFinite(value)) return;
    return item.update({ "system.uses.value": value });
  });
}

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
    _prepareInventoryContainers(this, data);
    return data;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    _applyTheme(this);
    _bindThemeToggle(this, html);
    _bindRollActions(this, html);
    _bindContainerContents(this, html);
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
    _prepareInventoryContainers(this, data);
    return data;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    _applyTheme(this);
    _bindThemeToggle(this, html);
    _bindRollActions(this, html);
    _bindContainerContents(this, html);
  }
}
