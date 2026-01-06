// Main compound component
export { AssignmentCard } from "./AssignmentCard";

// Sub-components (also available as AssignmentCard.* properties)
export { DateTime } from "./DateTime";
export { Teams } from "./Teams";
export { CityInfo } from "./CityInfo";
export { Header } from "./Header";
export { Location } from "./Location";
export { SingleBallNotice } from "./SingleBallNotice";
export { Status } from "./Status";
export { GameInfo } from "./GameInfo";
export { Referees } from "./Referees";
export { Details } from "./Details";

// Context for custom sub-components
export {
  AssignmentCardContext,
  useAssignmentCardContext,
  type AssignmentCardContextValue,
} from "./context";
