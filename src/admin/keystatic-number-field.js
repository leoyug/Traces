import { NumberField as NativeNumberField } from "@local/keystar-number-field";
import { validateOnSubmit } from "./submit-validation.js";

export * from "@local/keystar-number-field";
export const NumberField = validateOnSubmit(NativeNumberField);
