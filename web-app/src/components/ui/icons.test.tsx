import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  UploadIcon,
  CameraIcon,
  CheckIcon,
  FileIcon,
  AlertIcon,
} from "./icons";

const icons = [
  { name: "UploadIcon", Component: UploadIcon },
  { name: "CameraIcon", Component: CameraIcon },
  { name: "CheckIcon", Component: CheckIcon },
  { name: "FileIcon", Component: FileIcon },
  { name: "AlertIcon", Component: AlertIcon },
];

describe("Icon components", () => {
  describe.each(icons)("$name", ({ Component }) => {
    it("renders an SVG element", () => {
      const { container } = render(<Component />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("applies aria-hidden for accessibility", () => {
      const { container } = render(<Component />);
      expect(container.querySelector("svg")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    });

    it("applies custom className", () => {
      const { container } = render(<Component className="custom-class" />);
      expect(container.querySelector("svg")).toHaveClass("custom-class");
    });
  });
});
