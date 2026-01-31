/**
 * Property render configurations for API endpoints.
 * These arrays tell the API which fields to include in responses.
 *
 * Shared between web and mobile apps to ensure consistent data fetching.
 */

/**
 * Property configuration for assignments endpoint.
 */
export const ASSIGNMENT_PROPERTIES = [
  'refereeConvocationStatus',
  'refereeGame.game.startingDateTime',
  'refereeGame.game.playingWeekday',
  'isOpenEntryInRefereeGameExchange',
  'confirmationStatus',
  'confirmationDate',
  'hasLastMessageToReferee',
  'hasLinkedDoubleConvocation',
  'linkedDoubleConvocationGameNumberAndRefereePosition',
  'refereeGame.game.encounter.teamHome.name',
  'refereeGame.game.encounter.teamAway.name',
  'refereeGame.game.hasNominationListToReviewByReferee',
  'refereePosition',
  'refereeGame.game.number',
  'refereeGame.game.group.phase.league.leagueCategory.name',
  'refereeGame.game.group.phase.league.gender',
  'refereeGame.game.group.phase.name',
  'refereeGame.game.group.name',
  'refereeGame.activeRefereeConvocationFirstHeadReferee.indoorAssociationReferee.indoorReferee.person.displayName',
  'refereeGame.activeRefereeConvocationSecondHeadReferee.indoorAssociationReferee.indoorReferee.person.displayName',
  'refereeGame.activeRefereeConvocationFirstLinesman.indoorAssociationReferee.indoorReferee.person.displayName',
  'refereeGame.activeRefereeConvocationSecondLinesman.indoorAssociationReferee.indoorReferee.person.displayName',
  'refereeGame.activeRefereeConvocationThirdLinesman.indoorAssociationReferee.indoorReferee.person.displayName',
  'refereeGame.activeRefereeConvocationFourthLinesman.indoorAssociationReferee.indoorReferee.person.displayName',
  'refereeGame.activeRefereeConvocationStandbyHeadReferee.indoorAssociationReferee.indoorReferee.person.displayName',
  'refereeGame.activeRefereeConvocationStandbyLinesman.indoorAssociationReferee.indoorReferee.person.displayName',
  'refereeGame.game.hall.name',
  'refereeGame.game.hall.primaryPostalAddress.additionToAddress',
  'refereeGame.game.hall.primaryPostalAddress.combinedAddress',
  'refereeGame.game.hall.primaryPostalAddress.postalCode',
  'refereeGame.game.hall.primaryPostalAddress.city',
  'refereeGame.game.hall.primaryPostalAddress.geographicalLocation.plusCode',
  'refereeGame.game.hall.primaryPostalAddress.geographicalLocation.latitude',
  'refereeGame.game.hall.primaryPostalAddress.geographicalLocation.longitude',
  'refereeGame.game.lastPostponement.activeRefereeConvocationsAtTimeOfAcceptedPostponement.*.indoorAssociationReferee.indoorReferee.person',
  'refereeGame.game.lastPostponement.createdAt',
  'refereeGame.isGameInFuture',
  // Compensation data for eager loading (avoids separate API call when opening dialog)
  // Parent object must be requested before nested properties to ensure
  // the API populates the nested structure correctly.
  // Note: Only database fields work here - computed fields like *Formatted and
  // hasFlexible* are only available via the compensations endpoint.
  'convocationCompensation',
  'convocationCompensation.__identity',
  // Lock flags for editability check
  'convocationCompensation.paymentDone',
  'convocationCompensation.lockPayoutOnSiteCompensation',
  'convocationCompensation.lockPayoutCentralPayoutCompensation',
  'convocationCompensation.methodOfDisbursementArbitration',
  // Distance and travel data for compensation editing
  'convocationCompensation.distanceInMetres',
  'convocationCompensation.transportationMode',
  // Validation status for swipe button color.
  // Parent object must be requested before nested property to ensure
  // the API populates the nested structure correctly.
  'refereeGame.game.scoresheet',
  'refereeGame.game.scoresheet.closedAt',
]

/**
 * Property configuration for exchanges endpoint.
 */
export const EXCHANGE_PROPERTIES = [
  'refereeGame.game.startingDateTime',
  'refereeGame.game.playingWeekday',
  'submittedAt',
  // Parent object must be requested before nested properties
  'submittedByPerson',
  'submittedByPerson.__identity',
  'submittedByPerson.firstName',
  'submittedByPerson.lastName',
  'submittedByPerson.displayName',
  'submittingType',
  'status',
  'refereePosition',
  'requiredRefereeLevel',
  'requiredRefereeLevelGradationValue',
  'appliedBy.indoorReferee.person.displayName',
  'appliedAt',
  'refereeGame.game.number',
  'refereeGame.game.group.phase.league.leagueCategory.name',
  'refereeGame.game.group.phase.league.gender',
  'refereeGame.game.group.name',
  'refereeGame.game.group.phase.name',
  'refereeGame.game.encounter.teamHome.identifier',
  'refereeGame.game.encounter.teamHome.name',
  'refereeGame.game.encounter.teamAway.identifier',
  'refereeGame.game.encounter.teamAway.name',
  'refereeGame.game.hall.name',
  'refereeGame.game.hall.primaryPostalAddress.additionToAddress',
  'refereeGame.game.hall.primaryPostalAddress.combinedAddress',
  'refereeGame.game.hall.primaryPostalAddress.postalCode',
  'refereeGame.game.hall.primaryPostalAddress.city',
  'refereeGame.game.hall.primaryPostalAddress.geographicalLocation.plusCode',
  'refereeGame.game.hall.primaryPostalAddress.geographicalLocation.latitude',
  'refereeGame.game.hall.primaryPostalAddress.geographicalLocation.longitude',
  'refereeGame.activeFirstHeadRefereeName',
  'refereeGame.openFirstHeadRefereeName',
  'refereeGame.activeSecondHeadRefereeName',
  'refereeGame.openSecondHeadRefereeName',
  'refereeGame.activeFirstLinesmanRefereeName',
  'refereeGame.openFirstLinesmanRefereeName',
  'refereeGame.activeSecondLinesmanRefereeName',
  'refereeGame.openSecondLinesmanRefereeName',
  'refereeGame.activeThirdLinesmanRefereeName',
  'refereeGame.openThirdLinesmanRefereeName',
  'refereeGame.activeFourthLinesmanRefereeName',
  'refereeGame.openFourthLinesmanRefereeName',
  'refereeGame.activeRefereeConvocationFirstHeadReferee',
  'refereeGame.activeRefereeConvocationSecondHeadReferee',
  'refereeGame.activeRefereeConvocationFirstLinesman',
  'refereeGame.activeRefereeConvocationSecondLinesman',
  'refereeGame.activeRefereeConvocationThirdLinesman',
  'refereeGame.activeRefereeConvocationFourthLinesman',
  'refereeGame.activeRefereeConvocationStandbyHeadReferee',
  'refereeGame.activeRefereeConvocationStandbyLinesman',
]

/**
 * Property configuration for compensations endpoint.
 */
export const COMPENSATION_PROPERTIES = [
  'refereeConvocationStatus',
  'compensationDate',
  'refereeGame.game.startingDateTime',
  'refereeGame.game.playingWeekday',
  'refereeGame.game.number',
  'refereeGame.game.group.phase.league.leagueCategory.name',
  'refereeGame.game.group.name',
  'refereeGame.game.group.phase.name',
  'refereeGame.game.group.phase.league.gender',
  'refereeGame.game.encounter.teamHome.name',
  'refereeGame.game.encounter.teamAway.name',
  'refereeGame.game.hall.name',
  'refereeGame.game.hall.primaryPostalAddress.additionToAddress',
  'refereeGame.game.hall.primaryPostalAddress.combinedAddress',
  'refereeGame.game.hall.primaryPostalAddress.country.countryCode',
  'refereeGame.game.hall.primaryPostalAddress.postalCode',
  'refereeGame.game.hall.primaryPostalAddress.city',
  'refereePosition',
  'convocationCompensation.hasFlexibleGameCompensations',
  'convocationCompensation.gameCompensationFormatted',
  'convocationCompensation.hasFlexibleTravelExpenses',
  'convocationCompensation.travelExpensesFormatted',
  'convocationCompensation.hasFlexibleOvernightStayExpenses',
  'convocationCompensation.overnightStayExpensesFormatted',
  'convocationCompensation.hasFlexibleCateringExpenses',
  'convocationCompensation.cateringExpensesFormatted',
  'convocationCompensation.costFormatted',
  'convocationCompensation.distanceInMetres',
  'convocationCompensation.distanceFormatted',
  'convocationCompensation.transportationMode',
  'convocationCompensation.paymentDone',
  'convocationCompensation.lockPayoutOnSiteCompensation',
  'convocationCompensation.lockPayoutCentralPayoutCompensation',
  'convocationCompensation.methodOfDisbursementArbitration',
  'convocationCompensation.paymentValueDate',
  'convocationCompensation.paymentUpdatedByAssociation.name',
  'indoorAssociationReferee.indoorReferee.person.associationId',
  'refereeGame.isGameInFuture',
  'refereeGame.game.isVolleyCupGameWithoutNationalAssociationLeagueCategoryTeams',
  'refereeGame.game.displayName',
]

/**
 * Property configuration for referee backup (Pikett) endpoint.
 * Used to fetch on-call referee schedules for NLA/NLB games.
 */
export const REFEREE_BACKUP_PROPERTIES = [
  'date',
  'weekday',
  'calendarWeek',
  'joinedNlaReferees',
  'joinedNlbReferees',
  // NLA referee identity (required for filtering user's assignments)
  // Request person object first to ensure nested __identity is populated
  'nlaReferees.*.indoorReferee.person',
  'nlaReferees.*.indoorReferee.person.__identity',
  // NLA referee details
  'nlaReferees.*.indoorReferee.person.primaryEmailAddress',
  'nlaReferees.*.indoorReferee.person.primaryPhoneNumber',
  // NLB referee identity (required for filtering user's assignments)
  // Request person object first to ensure nested __identity is populated
  'nlbReferees.*.indoorReferee.person',
  'nlbReferees.*.indoorReferee.person.__identity',
  // NLB referee details
  'nlbReferees.*.indoorReferee.person.primaryEmailAddress',
  'nlbReferees.*.indoorReferee.person.primaryPhoneNumber',
]
