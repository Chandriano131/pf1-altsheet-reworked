/**
 * Handlebars helpers para o PF1E Alt Sheet Reworked.
 */

export function registerHandlebarsHelpers() {
  /** Retorna true se o valor for positivo */
  Handlebars.registerHelper("pf1ar_isPositive", (value) => Number(value) > 0);

  /** Retorna true se o valor for negativo */
  Handlebars.registerHelper("pf1ar_isNegative", (value) => Number(value) < 0);

  /** Formata modificador com sinal (ex: +3, -1, +0) */
  Handlebars.registerHelper("pf1ar_signedNum", (value) => {
    const n = Number(value ?? 0);
    return n >= 0 ? `+${n}` : `${n}`;
  });

  /** Verifica se ability possui algum dano/dreno/penalidade */
  Handlebars.registerHelper("pf1ar_abilityDamaged", (abl) => {
    return (abl?.damage ?? 0) > 0 || (abl?.drain ?? 0) > 0 || (abl?.penalty ?? 0) > 0;
  });

  /** Localiza chaves recebidas do PF1E sem alterar rótulos já resolvidos. */
  Handlebars.registerHelper("pf1ar_localize", (value) => {
    if (typeof value !== "string") return value ?? "";
    const localized = value.includes(".") ? game.i18n.localize(value) : value;
    return localized === value ? value : localized;
  });

  /** Verifica uso de sistema métrico */
  Handlebars.registerHelper("pf1ar_isMetric", () => {
    return game.settings.get("pf1", "units") === "metric";
  });
}
