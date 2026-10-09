import type { Metadata } from "next";
import { TextPage } from "@/components/site-chrome";
import { SITE } from "@/config/site";

export const metadata: Metadata = { title: "Terms of service · Tolely" };

// DRAFT: have this reviewed by a lawyer before launch.
export default function TermsPage() {
  return (
    <TextPage title="Terms of service" updated="October 2026">
      <p>
        By using {SITE.name} you agree to these terms. {SITE.name} is a platform that connects customers with
        independent local service suppliers.
      </p>

      <h2>Our role</h2>
      <p>
        Suppliers on {SITE.name} are independent and are not our employees. We verify suppliers before they can
        accept jobs, but the supplier is responsible for the work they do.
      </p>

      <h2>For customers</h2>
      <ul>
        <li>Give a correct address and be available at the booked time.</li>
        <li>The price shown when you book is the price for the selected option. Extra work or parts must be agreed with the supplier before it is done.</li>
        <li>Pay the supplier when the job is done, in cash or by QR.</li>
        <li>You can cancel a booking until the supplier is on the way.</li>
      </ul>

      <h2>For suppliers</h2>
      <ul>
        <li>Give true information about yourself, your vehicle and your water source.</li>
        <li>Arrive on time, do the work properly and charge only the agreed price.</li>
        <li>If you cannot do an accepted job, release it in the app as early as possible.</li>
        <li>Tanker suppliers must deliver water from the source they told us about.</li>
        <li>We may suspend suppliers who get repeated complaints or break these terms.</li>
      </ul>

      <h2>Ratings and reports</h2>
      <p>
        Ratings must be honest and about the job. Use “Report a problem” in the app for any issue; our team will
        look into it.
      </p>

      <h2>Accounts</h2>
      <p>
        Keep your phone and login code private. We may suspend accounts used for fraud, abuse or false bookings.
        You can delete your account at any time from the app.
      </p>

      <h2>Limits</h2>
      <p>
        We work to keep {SITE.name} available and safe, but we cannot guarantee that a supplier will always be
        available or that the service will never be interrupted.
      </p>

      <h2>Law</h2>
      <p>These terms are governed by the laws of Nepal.</p>
    </TextPage>
  );
}
