import { CARD_SCOPE_ATTRIBUTE } from './mount-card.constants'

// Selectors and the .kr-input-field text propagation come from the classic theme stylesheet
// (static.payzen.eu krypton-client V4.0 ext/classic-reset.css); the look is driven by --araute-* variables
// set on the container, so the same variable names style the Krypton form and the test frame.
// Krypton styles the inputs inside its iframes by copying the computed style of the hidden .krFieldRepresentation
// markup, whose .kr-inner-wrapper the classic theme sizes at 31px with an 8px inset, so the representation is
// resized to the field height to center the text. Its iframes keep their own placeholder color, so the card holder
// input, which lives in the page, takes that same gray instead of --araute-color-text-placeholder.
export function buildKryptonAppearanceCss(
  scopeId: string,
  options: { styled: boolean; hidePaymentButton: boolean },
): string {
  const scope = `[${CARD_SCOPE_ATTRIBUTE}="${scopeId}"]`
  const hidden = options.hidePaymentButton ? `${scope} .kr-payment-button{display:none !important}` : ''
  const styled = `
${scope}.kr-embedded{display:grid !important;grid-template-columns:1fr 1fr;column-gap:12px;width:100%;font-family:var(--araute-font-family,inherit)}
${scope} .kr-pan,${scope} .kr-expiry,${scope} .kr-security-code,${scope} .kr-card-holder-name,${scope} .kr-card-holder-mail{box-sizing:border-box !important;width:100% !important;height:var(--araute-input-height,54px) !important;margin:0 0 12px !important;overflow:hidden;background:var(--araute-color-background,#fff) !important;border:1px solid var(--araute-color-border,#e8e8e8) !important;border-radius:var(--araute-border-radius,16px) !important;transition:border-color .15s,box-shadow .15s}
${scope} .kr-pan,${scope} .kr-card-holder-name,${scope} .kr-card-holder-mail{grid-column:1 / -1}
${scope} .kr-pan:focus-within,${scope} .kr-expiry:focus-within,${scope} .kr-security-code:focus-within{border-color:var(--araute-color-border-focus,#0e7aff) !important;box-shadow:0 0 0 2px var(--araute-color-background,#fff),0 0 0 4px color-mix(in srgb,var(--araute-color-border-focus,#0e7aff) 10%,transparent)}
${scope} .kr-field-wrapper,${scope} .kr-field-component{height:100% !important;background:transparent !important}
${scope} input.kr-input-field{box-sizing:border-box !important;height:100% !important;padding:0 16px !important;background:transparent !important;font-family:var(--araute-font-family,inherit) !important;font-size:var(--araute-font-size,15px) !important;color:var(--araute-color-text,#000) !important}
${scope} input.kr-input-field::placeholder{color:#767676 !important;opacity:1}
${scope} .krFieldRepresentation .kr-inner-wrapper{height:calc(var(--araute-input-height,54px) - 2px) !important;margin:0 !important;padding:0 !important}
${scope} .krFieldRepresentation input.kr-input-field{height:calc(var(--araute-input-height,54px) - 2px) !important}
${scope} .kr-field-wrapper{align-items:center !important}
${scope} .kr-icon-wrapper-root{align-self:center !important;margin:0 !important}
${scope} .kr-help-button-wrapper .kr-help-button{height:100% !important}
${scope} .kr-form-error{grid-column:1 / -1;margin:0 !important;color:var(--araute-color-danger,#ef4444) !important;font-family:var(--araute-font-family,inherit);font-size:12px;line-height:18px}
${scope} .kr-payment-button{grid-column:1 / -1;box-sizing:border-box;width:100%;height:var(--araute-input-height,54px);border:0;border-radius:var(--araute-border-radius,16px);background:var(--araute-color-primary,#0e7aff);color:var(--araute-color-primary-text,#fff);font-family:var(--araute-font-family,inherit);font-size:var(--araute-font-size,15px);cursor:pointer}
`
  return options.styled ? styled + hidden : hidden
}
