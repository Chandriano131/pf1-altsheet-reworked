# PF1E Alt Sheet Reworked

A modernized alternative character sheet for the **Pathfinder 1e (PF1E)** system on **Foundry VTT v13**.

## About

This module is a modernization and recreation of the original **PF1 Alt Sheet** module (`pf1-alt-sheet`), developed by **Tryss Farron (Fair Strides)** and **Zenvy**. The original module was used as technical and conceptual reference.

The **Pathfinder 1e for Foundry VTT** system was also used as a reference for compatibility, data structure, and integration with Foundry VTT v13.

> **AI Disclosure:** This module was developed with assistance from AI tools — including **Claude (Anthropic)** and **OpenAI Codex** — for code generation, refactoring, visual review and documentation support. Authorship, review and final responsibility belong to the maintainers of this repository, Anthropic and OpenAI.

## Status

> **Active development — visual rework release (v0.2.1)**

Implemented:
- [x] Correct registration of the alternative sheet for PF1E actors (character and NPC)
- [x] Summary tab with ability scores, HP, AC, saving throws, and ranked skills
- [x] Persistent header with portrait, name, biographical info, and level
- [x] Icon-based tab navigation with clear active states
- [x] Custom layouts for Attributes, Combat, Inventory, Features, Skills and Buffs
- [x] PF1E spellbook and settings partials integrated with the module visual language
- [x] Rollable stats (abilities, saves, initiative, BAB/CMB, attacks, skills) wired to the PF1E roll API
- [x] Animated d20 hover on rollable dice icons (Skills, Attributes, Combat, Inventory, Spells)
- [x] **Dark mode** toggle (per-user), button at the top-left above the portrait
- [x] Responsive layouts for narrower sheet windows
- [x] English and Brazilian Portuguese module labels

Planned:
- [ ] Additional visual themes (Pathfinder, Default, etc.)
- [ ] Additional localization (de, es)

## Known Limitations

- The Summary tab only shows skills with at least 1 rank (intentional condensed list)
- Some complex areas intentionally reuse PF1E 11.11 partials to preserve system behavior
- Targeted at Foundry VTT v13 and PF1E 11.11; Foundry v14 is not currently supported

## Manual Installation

1. Copy the module folder to `{your-foundry-data}/modules/pf1-altsheet-reworked/`
2. Make sure `module.json` is at the root of that folder
3. Enable the module in Foundry VTT's module settings
4. Open a PF1E actor sheet, click the sheet configuration icon, and select **"Alt PC Sheet (Reworked)"**

## Compatibility

| Software | Version |
|----------|---------|
| Foundry VTT | v13 |
| PF1E System | v11.11 |

## Credits and Attributions

This module was developed as a modernization and recreation of the original **PF1 Alt Sheet** module, using it as technical and conceptual reference.

The **Pathfinder 1e for Foundry VTT** system was also used as a reference for compatibility, data structure, and Foundry VTT v13 integration.

All credits to the original authors of the base module and the PF1E system must be preserved:

- **PF1 Alt Sheet** (original): Tryss Farron (Fair Strides), Zenvy
- **Pathfinder 1e for Foundry VTT**: PF1E system development team (to confirm)
- **AI assistance**: Claude (Anthropic) and OpenAI Codex were used for code generation, refactoring, visual review and documentation support

## License

The original PF1 Alt Sheet reference module is licensed under GNU GPL v3. The final licensing and distribution terms of this reworked module must preserve all applicable obligations and attributions.
