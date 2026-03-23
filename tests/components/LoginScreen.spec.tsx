import { test, expect } from "@playwright/experimental-ct-react";
import LoginScreen from "../../src/components/LoginScreen";

test.describe("LoginScreen", () => {
  test("renders heading and scope badges", async ({ mount }) => {
    const component = await mount(<LoginScreen onLogin={async () => {}} />);
    await expect(component.getByText("PR Hub")).toBeVisible();
    await expect(component.getByText("repo")).toBeVisible();
    await expect(component.getByText("read:user")).toBeVisible();
  });

  test("login button is disabled when input is empty", async ({ mount }) => {
    const component = await mount(<LoginScreen onLogin={async () => {}} />);
    const button = component.getByRole("button", { name: "Login" });
    await expect(button).toBeDisabled();
  });

  test("login button is enabled when input has text", async ({ mount }) => {
    const component = await mount(<LoginScreen onLogin={async () => {}} />);
    await component.getByPlaceholder("ghp_…").fill("ghp_test123");
    const button = component.getByRole("button", { name: "Login" });
    await expect(button).toBeEnabled();
  });

  test("shows error for non-ghp_ token", async ({ mount }) => {
    const component = await mount(<LoginScreen onLogin={async () => {}} />);
    await component.getByPlaceholder("ghp_…").fill("gho_invalid");
    await component.getByRole("button", { name: "Login" }).click();
    await expect(component.getByText(/Classic PAT/)).toBeVisible();
  });

  test("calls onLogin with valid token", async ({ mount }) => {
    let receivedToken = "";
    const component = await mount(
      <LoginScreen onLogin={async (token) => { receivedToken = token; }} />
    );
    await component.getByPlaceholder("ghp_…").fill("ghp_abc123");
    await component.getByRole("button", { name: "Login" }).click();
    expect(receivedToken).toBe("ghp_abc123");
  });
});
