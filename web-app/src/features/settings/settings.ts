import type { TourDefinition } from '@/shared/components/tour/definitions/types'

export const settingsTour: TourDefinition = {
  id: 'settings',
  steps: [
    {
      id: 'language',
      targetSelector: "[data-tour='language-switcher']",
      titleKey: 'tour.settings.language.title',
      descriptionKey: 'tour.settings.language.description',
      placement: 'bottom',
      completionEvent: { type: 'click' },
    },
    {
      id: 'homeLocation',
      targetSelector: "[data-tour='home-location']",
      titleKey: 'tour.settings.homeLocation.title',
      descriptionKey: 'tour.settings.homeLocation.description',
      placement: 'bottom',
      completionEvent: { type: 'click' },
    },
    {
      id: 'arrivalTime',
      targetSelector: "[data-tour='arrival-time']",
      titleKey: 'tour.settings.arrivalTime.title',
      descriptionKey: 'tour.settings.arrivalTime.description',
      placement: 'bottom',
      completionEvent: { type: 'click' },
    },
    {
      id: 'complete',
      targetSelector: "[data-tour='tour-reset']",
      titleKey: 'tour.settings.complete.title',
      descriptionKey: 'tour.settings.complete.description',
      placement: 'bottom',
      completionEvent: { type: 'auto', delay: 3000 },
    },
  ],
}
