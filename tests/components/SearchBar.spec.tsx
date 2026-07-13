import { test, expect } from "@playwright/experimental-ct-react";
import SearchBar from "../../src/components/SearchBar";

test.describe("SearchBar", () => {
  test("renders the filter placeholder", async ({ mount }) => {
    const component = await mount(
      <SearchBar value="" onChange={() => {}} resultCount={5} totalCount={5} />
    );
    await expect(component.getByPlaceholder("Filter PRs…")).toBeVisible();
  });

  test("hides count and clear button when the query is empty", async ({ mount }) => {
    const component = await mount(
      <SearchBar value="" onChange={() => {}} resultCount={5} totalCount={5} />
    );
    await expect(component.getByLabel("Clear filter")).toHaveCount(0);
  });

  test("shows result count and clear button when a query is present", async ({ mount }) => {
    const component = await mount(
      <SearchBar value="PLA" onChange={() => {}} resultCount={2} totalCount={5} />
    );
    await expect(component.getByText("2/5")).toBeVisible();
    await expect(component.getByLabel("Clear filter")).toBeVisible();
  });

  test("clear button requests an empty value", async ({ mount }) => {
    let changed: string | null = null;
    const component = await mount(
      <SearchBar value="PLA-252" onChange={(v) => { changed = v; }} resultCount={1} totalCount={5} />
    );
    await component.getByLabel("Clear filter").click();
    expect(changed).toBe("");
  });

  test("Escape requests an empty value", async ({ mount }) => {
    let changed: string | null = null;
    const component = await mount(
      <SearchBar value="dark mode" onChange={(v) => { changed = v; }} resultCount={1} totalCount={5} />
    );
    await component.getByPlaceholder("Filter PRs…").press("Escape");
    expect(changed).toBe("");
  });

  test("typing requests the updated value", async ({ mount }) => {
    let changed: string | null = null;
    const component = await mount(
      <SearchBar value="" onChange={(v) => { changed = v; }} resultCount={5} totalCount={5} />
    );
    await component.getByPlaceholder("Filter PRs…").pressSequentially("a");
    expect(changed).toBe("a");
  });
});
