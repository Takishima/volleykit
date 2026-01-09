import { memo, useMemo } from "react";
import { ExpandableCard } from "@/shared/components/ExpandableCard";
import type { Assignment } from "@/api/client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useDateFormat } from "@/shared/hooks/useDateFormat";
import { getPositionLabel } from "@/shared/utils/position-labels";
import { buildMapsUrls } from "@/shared/utils/maps-url";
import { extractCoordinates } from "@/shared/utils/geo-location";
import { useSettingsStore } from "@/shared/stores/settings";
import { useActiveAssociationCode } from "@/features/auth/hooks/useActiveAssociation";
import { useSbbUrl } from "@/shared/hooks/useSbbUrl";
import {
  detectSingleBallHall,
  getSingleBallHallsPdfPath,
} from "@/shared/utils/single-ball-halls";
import {
  AssignmentCardContext,
  getRefereeDisplayName,
  type AssignmentCardContextValue,
} from "./context";

// Import sub-components
import { DateTime } from "./DateTime";
import { Teams } from "./Teams";
import { CityInfo } from "./CityInfo";
import { Header } from "./Header";
import { Location } from "./Location";
import { SingleBallNotice } from "./SingleBallNotice";
import { Status } from "./Status";
import { GameInfo } from "./GameInfo";
import { Referees } from "./Referees";
import { Details } from "./Details";

interface AssignmentCardProps {
  assignment: Assignment;
  onClick?: () => void;
  /** When true, expansion is disabled and the arrow is hidden */
  disableExpansion?: boolean;
  /** Optional data-tour attribute for guided tours */
  dataTour?: string;
}

/**
 * A compound component for displaying assignment information.
 *
 * Sub-components are available as static properties for external composition:
 * - AssignmentCard.DateTime - Date and time display
 * - AssignmentCard.Teams - Teams, position, and gender
 * - AssignmentCard.CityInfo - City and league category
 * - AssignmentCard.Header - Composed compact view
 * - AssignmentCard.Location - Hall with navigation buttons
 * - AssignmentCard.SingleBallNotice - Single-ball hall warning
 * - AssignmentCard.Status - Status badge
 * - AssignmentCard.GameInfo - Game number and category
 * - AssignmentCard.Referees - Referee names
 * - AssignmentCard.Details - Composed details section
 *
 * @example
 * ```tsx
 * <AssignmentCard assignment={assignment} />
 * ```
 */
function AssignmentCardComponent({
  assignment,
  onClick,
  disableExpansion,
  dataTour,
}: AssignmentCardProps) {
  const { t, locale } = useTranslation();
  const associationCode = useActiveAssociationCode();

  const game = assignment.refereeGame?.game;

  const {
    dateLabel,
    timeLabel,
    isToday,
    isPast: isGamePast,
  } = useDateFormat(game?.startingDateTime);

  const homeTeam = game?.encounter?.teamHome?.name || t("common.tbd");
  const awayTeam = game?.encounter?.teamAway?.name || t("common.tbd");
  const hallName = game?.hall?.name || t("common.locationTbd");
  const postalAddress = game?.hall?.primaryPostalAddress;
  const city = postalAddress?.city;

  const {
    googleMapsUrl,
    nativeMapsUrl: addressMapsUrl,
    fullAddress,
  } = buildMapsUrls(postalAddress, hallName);

  const status = assignment.refereeConvocationStatus;
  const position = getPositionLabel(
    assignment.refereePosition,
    t,
    t("occupations.referee")
  );
  const gender = game?.group?.phase?.league?.gender;

  // Referee names from the refereeGame
  const refereeGame = assignment.refereeGame;
  const headReferee1 = getRefereeDisplayName(
    refereeGame?.activeRefereeConvocationFirstHeadReferee
  );
  const headReferee2 = getRefereeDisplayName(
    refereeGame?.activeRefereeConvocationSecondHeadReferee
  );
  const linesman1 = getRefereeDisplayName(
    refereeGame?.activeRefereeConvocationFirstLinesman
  );
  const linesman2 = getRefereeDisplayName(
    refereeGame?.activeRefereeConvocationSecondLinesman
  );
  const linesman3 = getRefereeDisplayName(
    refereeGame?.activeRefereeConvocationThirdLinesman
  );
  const linesman4 = getRefereeDisplayName(
    refereeGame?.activeRefereeConvocationFourthLinesman
  );

  const linesmen = useMemo(
    () => [linesman1, linesman2, linesman3, linesman4].filter(Boolean),
    [linesman1, linesman2, linesman3, linesman4]
  ) as string[];

  // Get transport settings for the association
  const isTransportEnabled = useSettingsStore((state) =>
    state.isTransportEnabledForAssociation(associationCode)
  );

  // Extract hall coordinates and ID for travel time queries
  const geoLocation = game?.hall?.primaryPostalAddress?.geographicalLocation;
  const hallCoords = extractCoordinates(geoLocation);
  const hallId = game?.hall?.__identity;
  const gameStartingDateTime = game?.startingDateTime;

  // Hook to fetch trip data on demand and generate SBB URL with station ID
  const { isLoading: isSbbLoading, openSbbConnection } = useSbbUrl({
    hallCoords,
    hallId,
    city,
    hallAddress: fullAddress,
    gameStartTime: gameStartingDateTime,
    language: locale,
  });

  // Show SBB button if transport is enabled and we have the required data
  const showSbbButton = Boolean(
    isTransportEnabled && city && gameStartingDateTime
  );

  // Detect if this is a single-ball hall (NLA/NLB only)
  const singleBallMatch = detectSingleBallHall(assignment);
  const singleBallPdfPath = getSingleBallHallsPdfPath(locale);

  // Create context value
  const contextValue = useMemo(
    (): Omit<AssignmentCardContextValue, "expandArrow"> => ({
      assignment,
      game,
      dateLabel,
      timeLabel,
      isToday,
      isPast: isGamePast,
      homeTeam,
      awayTeam,
      hallName,
      city,
      fullAddress,
      googleMapsUrl,
      addressMapsUrl,
      status,
      position,
      gender,
      headReferee1,
      headReferee2,
      linesmen,
      showSbbButton,
      isSbbLoading,
      openSbbConnection,
      singleBallMatch,
      singleBallPdfPath,
    }),
    [
      assignment,
      game,
      dateLabel,
      timeLabel,
      isToday,
      isGamePast,
      homeTeam,
      awayTeam,
      hallName,
      city,
      fullAddress,
      googleMapsUrl,
      addressMapsUrl,
      status,
      position,
      gender,
      headReferee1,
      headReferee2,
      linesmen,
      showSbbButton,
      isSbbLoading,
      openSbbConnection,
      singleBallMatch,
      singleBallPdfPath,
    ]
  );

  return (
    <ExpandableCard
      data={assignment}
      onClick={onClick}
      disableExpansion={disableExpansion}
      dataTour={dataTour}
      className={isGamePast ? "opacity-75" : ""}
      renderCompact={(_, { expandArrow }) => (
        <AssignmentCardContext.Provider
          value={{ ...contextValue, expandArrow }}
        >
          <Header />
        </AssignmentCardContext.Provider>
      )}
      renderDetails={() => (
        <AssignmentCardContext.Provider
          value={{ ...contextValue, expandArrow: null }}
        >
          <Details />
        </AssignmentCardContext.Provider>
      )}
    />
  );
}

// Create the memoized component
const MemoizedAssignmentCard = memo(AssignmentCardComponent);

// Attach sub-components for compound pattern
type AssignmentCardType = typeof MemoizedAssignmentCard & {
  /** Date and time display for compact view */
  DateTime: typeof DateTime;
  /** Teams, position, and gender display for compact view */
  Teams: typeof Teams;
  /** City, league category, and expand arrow for compact view */
  CityInfo: typeof CityInfo;
  /** Composed header with all compact view elements */
  Header: typeof Header;
  /** Hall location with navigation buttons for details view */
  Location: typeof Location;
  /** Single-ball hall warning notice for details view */
  SingleBallNotice: typeof SingleBallNotice;
  /** Status badge for details view */
  Status: typeof Status;
  /** Game number and category info for details view */
  GameInfo: typeof GameInfo;
  /** Referee names for details view */
  Referees: typeof Referees;
  /** Composed details section with all expanded view elements */
  Details: typeof Details;
};

export const AssignmentCard = MemoizedAssignmentCard as AssignmentCardType;
AssignmentCard.DateTime = DateTime;
AssignmentCard.Teams = Teams;
AssignmentCard.CityInfo = CityInfo;
AssignmentCard.Header = Header;
AssignmentCard.Location = Location;
AssignmentCard.SingleBallNotice = SingleBallNotice;
AssignmentCard.Status = Status;
AssignmentCard.GameInfo = GameInfo;
AssignmentCard.Referees = Referees;
AssignmentCard.Details = Details;
