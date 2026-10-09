import { Picker as NativePicker } from "@local/keystar-picker";
import { validateOnSubmit } from "./submit-validation.js";

export * from "@local/keystar-picker";
export const Picker = validateOnSubmit(NativePicker);
