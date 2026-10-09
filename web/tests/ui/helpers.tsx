import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { LanguageProvider } from "@/client/i18n/provider";
import { ToastProvider } from "@/components/ui";

/** Renders a customer page the way the website does, in English unless told otherwise. */
export function renderPage(ui: ReactElement, language: "en" | "ne" = "en") {
  localStorage.setItem("tolely-language", language);
  return render(
    <LanguageProvider>
      <ToastProvider>{ui}</ToastProvider>
    </LanguageProvider>,
  );
}
