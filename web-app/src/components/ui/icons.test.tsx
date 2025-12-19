import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  Upload,
  Camera,
  Check,
  FileText,
  AlertCircle,
  ClipboardList,
  Wallet,
  ArrowLeftRight,
  Settings,
  UserPlus,
  RefreshCw,
  Trash2,
  Undo2,
  ChevronDown,
  Circle,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Lock,
  Inbox,
  Volleyball,
} from "./icons";

const icons = [
  { name: "Upload", Component: Upload },
  { name: "Camera", Component: Camera },
  { name: "Check", Component: Check },
  { name: "FileText", Component: FileText },
  { name: "AlertCircle", Component: AlertCircle },
  { name: "ClipboardList", Component: ClipboardList },
  { name: "Wallet", Component: Wallet },
  { name: "ArrowLeftRight", Component: ArrowLeftRight },
  { name: "Settings", Component: Settings },
  { name: "UserPlus", Component: UserPlus },
  { name: "RefreshCw", Component: RefreshCw },
  { name: "Trash2", Component: Trash2 },
  { name: "Undo2", Component: Undo2 },
  { name: "ChevronDown", Component: ChevronDown },
  { name: "Circle", Component: Circle },
  { name: "CheckCircle", Component: CheckCircle },
  { name: "AlertTriangle", Component: AlertTriangle },
  { name: "Calendar", Component: Calendar },
  { name: "Lock", Component: Lock },
  { name: "Inbox", Component: Inbox },
  { name: "Volleyball", Component: Volleyball },
];

describe("Lucide icon re-exports", () => {
  describe.each(icons)("$name", ({ Component }) => {
    it("renders an SVG element", () => {
      const { container } = render(<Component />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(<Component className="custom-class" />);
      expect(container.querySelector("svg")).toHaveClass("custom-class");
    });

    it("supports custom size via className", () => {
      const { container } = render(<Component className="w-6 h-6" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("w-6", "h-6");
    });
  });
});
