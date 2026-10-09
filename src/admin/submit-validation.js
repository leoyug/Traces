import { createElement, forwardRef } from "react";

/**
 * Keep native focus handling and number/date commits. Only suppress the CMS
 * field's blur callback, which marks it as validated before form submission.
 * Native forceValidation still supplies errors after Create or Save.
 * @template T
 * @param {T} NativeInput
 * @returns {T}
 */
export function validateOnSubmit(NativeInput) {
  const Input = forwardRef(function SubmitValidatedInput({ onBlur, ...props }, ref) {
    return createElement(NativeInput, {
      ...props,
      ref,
      onBlur(event) {
        if (event.currentTarget.closest("#item-create-form, #item-edit-form")) return;
        onBlur?.(event);
      },
    });
  });
  return /** @type {T} */ (/** @type {unknown} */ (Input));
}
