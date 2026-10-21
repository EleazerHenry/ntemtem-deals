import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/store/content-page";
import { content } from "@/lib/content";
import { site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What personal information Ntemtem Deals collects, why, who it's shared with, and your rights under Ghana's Data Protection Act.",
};

export default function PrivacyPage() {
  const business = content.legalName ?? site.name;

  return (
    <ContentPage
      path="/policies/privacy"
      title="Privacy Policy"
      lead="We respect your privacy. This policy explains what personal information we collect when you use our website, why we collect it, how we protect it, and the rights you have over it under Ghana's Data Protection Act, 2012 (Act 843)."
    >
      <div className="content-prose">
        <h2 className="!mt-0">Who we are</h2>
        <p>
          The business responsible for your data (the &ldquo;data controller&rdquo;) is {business}
          {content.address && `, ${content.address}`}. You can reach us <ContactUs />.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Your contact details:</strong> your name, email address and phone number, whether you check out as a guest or create an account. If
            you create an account, we also keep your password — stored only in scrambled (hashed) form, never in readable form.
          </li>
          <li>
            <strong>Order and delivery details:</strong> your delivery city, area and any landmark, the items you ordered, and your order history.
          </li>
          <li>
            <strong>Payment information:</strong> payments are processed by our payment partner, <strong>Paystack</strong>. Your card or Mobile Money
            details are entered on Paystack&apos;s secure system — <strong>we never see or store your card or MoMo numbers.</strong>
          </li>
          <li>
            <strong>Messages:</strong> anything you send us by WhatsApp, email or phone.
          </li>
          <li>
            <strong>Technical information:</strong> the basic cookies needed to keep you signed in and your cart working, and limited information used
            to keep the site secure and prevent fraud.
          </li>
        </ul>

        <h2>Why we collect it</h2>
        <p>We use your information to:</p>
        <ul>
          <li>take, source and deliver your orders, and keep you updated on their progress;</li>
          <li>process your payment and issue refunds where due;</li>
          <li>help you and answer your messages;</li>
          <li>keep the site secure and prevent fraud;</li>
          <li>meet our legal and tax obligations.</li>
        </ul>
        <p>
          We rely on carrying out our agreement with you (your order), our legitimate interest in running a safe shop, and compliance with the law. We
          only send marketing messages if you&apos;ve asked to receive them, and you can opt out at any time.
        </p>

        <h2>Who we share it with</h2>
        <p>We share your data only as needed to run the shop:</p>
        <ul>
          <li>
            <strong>Paystack</strong> — to process your payment securely.
          </li>
          <li>
            <strong>Our delivery partners</strong> — the name, phone number and address needed to deliver your order.
          </li>
          <li>
            <strong>Our hosting and email providers</strong> — who store the website&apos;s data and send your order and account emails for us.
          </li>
          <li>
            <strong>Authorities</strong> — only if the law requires it.
          </li>
        </ul>
        <p>
          We <strong>do not sell</strong> your personal data to anyone. Some of these providers store data on secure servers outside Ghana. Where that
          happens, we use reputable providers that protect your data to a high standard.
        </p>

        <h2>How long we keep it</h2>
        <p>
          We keep your account information for as long as you have an account with us, and your order records for {content.recordsKept} to meet legal
          and tax requirements. You can ask us to delete your data at any time (see your rights below).
        </p>

        <h2>How we protect it</h2>
        <p>
          We protect your information with encryption in transit (HTTPS), passwords stored only in hashed form, access controls, and secure, reputable
          service providers. No system is completely risk-free, but we take security seriously and act quickly if a problem arises.
        </p>

        <h2>Your rights</h2>
        <p>Under the Data Protection Act, 2012, you have the right to:</p>
        <ul>
          <li>ask what personal data we hold about you and get a copy;</li>
          <li>have inaccurate data corrected;</li>
          <li>ask us to delete your data;</li>
          <li>object to certain uses, and withdraw any consent you gave.</li>
        </ul>
        <p>
          To use any of these rights, contact us <ContactUs />. We&apos;ll respond within a reasonable time.
        </p>

        <h2>Cookies</h2>
        <p>
          We use essential cookies to keep you signed in and remember your cart. The site needs these to work.
          {content.usesAnalytics &&
            " We also use analytics to understand how the site is used, so we can improve it — this never includes your payment details."}
        </p>

        <h2>Children</h2>
        <p>Our shop is intended for adults and is not directed at children.</p>

        <h2>Changes to this policy</h2>
        <p>We may update this policy from time to time. The latest version will always be on this page, with the date it was last updated.</p>

        <h2>Contact and complaints</h2>
        <p>
          Questions or concerns about your data? Contact us <ContactUs />. You also have the right to complain to Ghana&apos;s{" "}
          <a href="https://www.dataprotection.org.gh" target="_blank" rel="noreferrer">
            Data Protection Commission
          </a>{" "}
          if you believe your data has been mishandled.
        </p>

        <p className="!mt-10 text-sm text-muted-foreground">
          <em>Last updated: {content.privacyUpdated}</em>
        </p>
      </div>
    </ContentPage>
  );
}

/** "at hello@… / 024… or on WhatsApp" — whichever contact details are set up. */
function ContactUs() {
  const whatsapp = whatsappLink();
  // "at" an address or number, "on" WhatsApp
  const ways = [
    site.email && { word: "at", link: <a href={`mailto:${site.email}`}>{site.email}</a> },
    content.phone && { word: "at", link: <a href={`tel:${content.phone.replace(/\s/g, "")}`}>{content.phone}</a> },
    whatsapp && { word: "on", link: <a href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a> },
  ].filter((w) => !!w);

  if (!ways.length) {
    return (
      <>
        through our <Link href="/contact">Contact</Link> page
      </>
    );
  }
  return (
    <>
      {ways.map(({ word, link }, i) => (
        <span key={i}>
          {i === 0 ? `${word} ` : i < ways.length - 1 ? ", " : word === "on" ? " or on " : " or "}
          {link}
        </span>
      ))}
    </>
  );
}
