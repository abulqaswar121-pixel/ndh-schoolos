import { fireEvent, render, screen, cleanup, within } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { Workspace } from "@/components/schoolos/Workspace";
import { SchoolOSProvider } from "@/context/SchoolOSContext";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(cleanup);
const renderWorkspace = () =>
  render(
    <SchoolOSProvider>
      <Workspace />
    </SchoolOSProvider>,
  );

describe("SchoolOS empty workspace", () => {
  it("starts with zero records and a genuine empty dashboard", () => {
    renderWorkspace();
    expect(screen.getByRole("heading", { name: "School overview" })).toBeInTheDocument();
    expect(screen.getByText("Your school’s story starts here")).toBeInTheDocument();
    expect(screen.getByText("No attendance recorded yet")).toBeInTheDocument();
    expect(screen.getByText("0/4")).toBeInTheDocument();
    expect(screen.getByText("A fresh financial start")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Let’s set up your school/ })).toBeInTheDocument();
  });
  it("opens searchable, empty student management", () => {
    renderWorkspace();
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Main navigation" })).getByRole("button", {
        name: "Students",
      }),
    );
    expect(screen.getByRole("heading", { name: "Students" })).toBeInTheDocument();
    expect(screen.getByText("Your students start here")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Student" })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Search students..."), {
      target: { value: "not registered" },
    });
    expect(screen.getByText("No matching records")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
  });
  it("searches module navigation and handles no matches", () => {
    renderWorkspace();
    fireEvent.change(screen.getByRole("textbox", { name: "Search workspace" }), {
      target: { value: "payroll" },
    });
    const matches = screen.getAllByRole("button", { name: /Staff & payroll/ });
    fireEvent.click(matches[matches.length - 1]!);
    expect(screen.getByRole("heading", { name: "Staff & payroll" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Search workspace" }), {
      target: { value: "unmatched module" },
    });
    expect(screen.getByText("No modules found.")).toBeInTheDocument();
  });
  it("supports Islamic and integrated school onboarding without adding default records", () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: /Let’s set up your school/ }));
    const modal = screen.getByRole("dialog");
    expect(within(modal).getByRole("button", { name: /Islamiyya \/ Tahfeez/ })).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole("button", { name: /Integrated/ }));
    fireEvent.change(within(modal).getByPlaceholderText("Enter your school’s official name"), {
      target: { value: "School entered by administrator" },
    });
    fireEvent.click(within(modal).getByRole("button", { name: "Continue" }));
    expect(
      within(modal).getByText(
        "No classes or subjects are added automatically. Everything starts with the names you choose.",
      ),
    ).toBeInTheDocument();
    expect(within(modal).getByRole("textbox", { name: /Your class or halqah names/ })).toHaveValue(
      "",
    );
  });
  it("shows an honest browser-storage and deployment notice in help", () => {
    renderWorkspace();
    fireEvent.click(screen.getByTitle("Help centre"));
    expect(
      screen.getByText(/A live database and server authentication must be configured/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Contact NDH support/ })).toHaveAttribute(
      "href",
      "mailto:support@ndh.com.ng",
    );
  });
  it("opens mobile navigation and closes it after selection", () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("button", { name: "Close navigation" })).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Main navigation" })).getByRole("button", {
        name: "Attendance",
      }),
    );
    expect(screen.queryByRole("button", { name: "Close navigation" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Attendance" })).toBeInTheDocument();
  });
});
