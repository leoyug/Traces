import { Combobox as NativeCombobox } from "@local/keystar-combobox";
import { validateOnSubmit } from "./submit-validation.js";

export * from "@local/keystar-combobox";
export const Combobox = validateOnSubmit(NativeCombobox);
