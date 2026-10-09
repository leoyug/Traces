import { TextField as NativeTextField, TextArea as NativeTextArea } from "@local/keystar-text-field";
import { validateOnSubmit } from "./submit-validation.js";

export * from "@local/keystar-text-field";
export const TextField = validateOnSubmit(NativeTextField);
export const TextArea = validateOnSubmit(NativeTextArea);
