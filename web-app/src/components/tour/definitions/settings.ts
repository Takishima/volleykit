import type { TourDefinition } from "./types";

export const settingsTour: TourDefinition = {
  id: "settings",
  steps: [
    {
      id: "language",
      targetSelector: "[data-tour='language-switcher']",
      titleKey: "tour.settings.language.title",
      descriptionKey: "tour.settings.language.description",
      placement: "bottom",
      completionEvent: { type: "click" },
    },
    {
      id: "complete",
      targetSelector: "[data-tour='tour-reset']",
      titleKey: "tour.settings.complete.title",
      descriptionKey: "tour.settings.complete.description",
      placement: "bottom",
      completionEvent: { type: "auto", delay: 3000 },
    },
  ],
};
