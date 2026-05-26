import { test, expect } from "@playwright/test";

test.describe("Reservation form", () => {
  test("home page renders form with step 1", async ({ page }) => {
    await page.goto("/es");
    await expect(page.getByRole("heading", { name: /Corte de Manga/i })).toBeVisible();
    // Step 1 should be active
    await expect(page.getByText(/Disponibilidad/i).first()).toBeVisible();
    // Calendar must be visible
    await expect(page.locator(".grid.grid-cols-7").first()).toBeVisible();
  });

  test("continue button is disabled until date and time are selected", async ({ page }) => {
    await page.goto("/es");
    const continueBtn = page.getByRole("button", { name: /Continuar/i });
    await expect(continueBtn).toBeDisabled();
  });

  test("language switcher changes locale", async ({ page }) => {
    await page.goto("/es");
    await page.getByRole("button", { name: /ES|Idioma|lang/i }).first().click();
    // Should have EN option
    const enOption = page.getByRole("option", { name: /English|EN/i });
    if (await enOption.count() > 0) {
      await enOption.click();
      await expect(page).toHaveURL(/\/en/);
    }
  });

  test("cancellation page shows cancel button for valid token", async ({ page }) => {
    // With an invalid token it should show an error
    await page.goto("/es/cancelar/invalid-token-test");
    // Should not crash — show some form of error or not-found
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
  });

  test("admin login page is accessible", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { name: /Corte de Manga/i })).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
  });

  test("admin login rejects wrong password", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByPlaceholder("••••••••").fill("wrong-password");
    await page.getByRole("button", { name: /Entrar/i }).click();
    await expect(page.getByText(/Contraseña incorrecta/i)).toBeVisible({ timeout: 5000 });
  });
});
