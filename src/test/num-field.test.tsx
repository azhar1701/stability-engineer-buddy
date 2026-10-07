import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NumField, NumInput } from "@/components/kit";
import { useState } from "react";

function ControlledWrapper({ initial = 12.5 }: { initial?: number }) {
  const [val, setVal] = useState(initial);
  return <NumField label="Lebar B" unit="m" value={val} onChange={setVal} />;
}

describe("NumField and NumInput ergonomics", () => {
  it("renders with initial value and unit", () => {
    render(<ControlledWrapper initial={6.0} />);
    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(input.value).toBe("6");
    expect(screen.getByText("m")).toBeInTheDocument();
  });

  it("allows clearing input on focus without forcing 0 while typing", () => {
    const handleChange = vi.fn();
    render(<NumInput value={12.5} onChange={handleChange} />);
    const input = screen.getByRole("spinbutton") as HTMLInputElement;

    // Focus on input
    fireEvent.focus(input);

    // User clears text to empty (backspace)
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    // Should not prematurely call onChange with 0 while user is actively typing
    expect(handleChange).not.toHaveBeenCalled();

    // User types new number 15
    fireEvent.change(input, { target: { value: "15" } });
    expect(input.value).toBe("15");
    expect(handleChange).toHaveBeenCalledWith(15);
  });

  it("resets to 0 on blur if left completely empty", () => {
    render(<ControlledWrapper initial={10} />);
    const input = screen.getByRole("spinbutton") as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(input.value).toBe("0");
  });
});
