import type { Metadata } from "next";
import { TextPage } from "@/components/site-chrome";
import { SITE } from "@/config/site";

export const metadata: Metadata = { title: "Privacy policy · Tolely" };

// DRAFT: have this reviewed (ideally by a lawyer familiar with Nepal's
// Individual Privacy Act, 2075) before publishing the app.
export default function PrivacyPage() {
  return (
    <TextPage title="Privacy policy" updated="October 2026">
      <p>
        This policy explains what information {SITE.name} collects when you use our app and website, why we
        collect it, and the choices you have.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account:</strong> your mobile number (for login) and your name.</li>
        <li><strong>Address:</strong> the address and landmark you enter so suppliers can reach you.</li>
        <li><strong>Bookings:</strong> the services you book, times, prices, status, ratings and notes.</li>
        <li><strong>Suppliers:</strong> name, working area, services, vehicle number and water source, and documents shared during verification.</li>
        <li><strong>Device:</strong> a notification token so we can send you booking updates.</li>
        <li><strong>Problem reports:</strong> what you write when you report an issue.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To create your account and log you in.</li>
        <li>To match bookings with suppliers and show live booking status.</li>
        <li>To send booking notifications.</li>
        <li>To verify suppliers, handle problem reports and keep the service safe.</li>
        <li>To improve our services, for example by seeing which areas need more suppliers.</li>
      </ul>

      <h2>Who can see your information</h2>
      <ul>
        <li>
          <strong>Suppliers</strong> see your name, phone number, address, landmark and note for jobs they can
          accept or have accepted, so they can do the job.
        </li>
        <li><strong>Customers</strong> see the name, phone number, vehicle number and rating of the supplier on their job.</li>
        <li><strong>Our team</strong> can see bookings and reports to provide support.</li>
        <li>
          <strong>Service providers</strong> we use to run {SITE.name} (Google Firebase for login, database and
          notifications; our hosting provider) process data on our behalf.
        </li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>How long we keep it</h2>
      <p>
        We keep your account while you use {SITE.name}. Booking records may be kept after you delete your account
        for accounting, dispute and legal reasons.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>You can update your name and address in the app.</li>
        <li>You can delete your account in the app under Profile → Delete account.</li>
        <li>You can turn off notifications in your phone settings.</li>
        {SITE.contactEmail && <li>For any privacy question, contact us at {SITE.contactEmail}.</li>}
      </ul>

      <h2>Changes</h2>
      <p>We will update this page if this policy changes and show the new date at the top.</p>
    </TextPage>
  );
}
