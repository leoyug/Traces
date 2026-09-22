import { play, setEnabled, setVolume, type SoundName } from "cuelume";

export type SoundPreference = "on" | "off";

const soundStorageKey = "incessant-sound";
const defaultVolume = 0.32;

export const getSoundPreference = (): SoundPreference =>
  localStorage.getItem(soundStorageKey) === "on" ? "on" : "off";

export const initializeSound = (): SoundPreference => {
  const preference = getSoundPreference();
  setVolume(defaultVolume);
  setEnabled(preference === "on");
  document.documentElement.dataset.soundPreference = preference;
  return preference;
};

export const playInterfaceSound = (sound: SoundName, volume = 1) => {
  play(sound, { volume });
};

export const setSoundPreference = (preference: SoundPreference) => {
  localStorage.setItem(soundStorageKey, preference);
  document.documentElement.dataset.soundPreference = preference;
  setVolume(defaultVolume);

  if (preference === "on") {
    setEnabled(true);
    play("chime", { volume: 0.75 });
    return;
  }

  play("droplet", { volume: 0.55 });
  setEnabled(false);
};
