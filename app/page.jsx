import Link from "next/link";
import FaqSection from "./components/FaqSection";
import FeaturedProperties from "./components/FeaturedProperties";
import {
  ArrowRight, CheckCircle, Shield, Zap, FileCheck,
  Users, Clock, Award, Star,
} from "lucide-react";

const appname = process.env.NEXT_PUBLIC_APP_NAME || "Sproutvest";
const appurl  = process.env.NEXT_PUBLIC_APP_URL  || "https://yourdomain.com";

// ─── SEO Metadata ─────────────────────────────────────────────────────────────
export const metadata = {
  metadataBase: new URL(appurl),
  title: `${appname} — Invest, Own and Trade Verified Land Across Nigeria`,
  description:
    "Join investors securing their financial future through fully verified land investments across Nigeria. Starting from just ₦5,000. Secure, transparent, and fully verified.",
  keywords: ["land investment Nigeria", "buy land Lagos", "real estate investment Nigeria", "verified land", appname],
  openGraph: {
    title: `${appname} — Invest in Fully Verified Land Across Nigeria`,
    description: "Secure your financial future with verified land investments. Starting from just ₦5,000.",
    url: appurl,
    siteName: appname,
    images: [{ url: `${appurl}/og-image.jpg`, width: 1200, height: 630, alt: `${appname} Land Investment Platform` }],
    type: "website",
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
    title: `${appname} — Invest in Fully Verified Land Across Nigeria`,
    description: "Secure your financial future with fully verified land investments.",
    images: [`${appurl}/og-image.jpg`],
  },
  alternates: { canonical: appurl },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
};

// ─── JSON-LD ──────────────────────────────────────────────────────────────────
function JsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: appname,
    url: appurl,
    logo: `${appurl}/logo.png`,
    description: "Nigeria's trusted platform for verified land investments. Starting from just ₦5,000.",
    address: { "@type": "PostalAddress", addressLocality: "Ibadan", addressRegion: "Oyo State", addressCountry: "NG" },
    contactPoint: { "@type": "ContactPoint", email: `hello@${appname.toLowerCase()}.com`, contactType: "customer service" },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

// ─── ISR fetch ────────────────────────────────────────────────────────────────
async function getLands() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/land`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    const data = json?.data || json || [];
    return Array.isArray(data) ? data.slice(0, 5) : [];
  } catch {
    return [];
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function Homepage() {
  const lands = await getLands();

  return (
    <>
      <JsonLd />
      <main className="bg-[#FDFAF5]" style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>

        {/* ── HERO ── */}
        <section
          className="relative flex items-center justify-center bg-[#0D1F1A]"
          style={{ minHeight: "90vh", paddingBottom: "80px", paddingTop: "60px" }}
        >
          {/* Background blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-5%] w-[55vw] h-[55vw] rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, #C8873A 0%, transparent 70%)" }} />
            <div className="absolute bottom-[-10%] right-[-5%] w-[45vw] h-[45vw] rounded-full opacity-15"
              style={{ background: "radial-gradient(circle, #2D7A55 0%, transparent 70%)" }} />
            <div className="absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          </div>

          <div className="relative z-10 w-full max-w-4xl mx-auto px-5 sm:px-8 text-center">

            {/* Headline*/}
            <h1
              className="font-bold text-white mb-5 leading-[1.08] tracking-tight"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(2rem, 6vw, 4.5rem)",
              }}
            >
              Invest, Own &amp; Trade Land.
              <br />
              <span style={{ color: "#C8873A" }}>Build Lasting Wealth.</span>
            </h1>

            <p
              className="text-white/55 mb-10 mx-auto leading-relaxed"
              style={{ fontSize: "clamp(0.95rem, 2.2vw, 1.15rem)", maxWidth: "34rem" }}
            >
              Fully verified land across Nigeria — starting from just{" "}
              <strong className="text-white/85">₦5,000</strong>.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-[#0D1F1A] transition-all hover:scale-105 active:scale-95 shadow-xl text-sm sm:text-base"
                style={{ background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }}
              >
                Start Investing
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white border border-white/20 hover:bg-white/10 transition-all text-sm sm:text-base"
              >
                Sign In
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-5 mt-8 text-xs text-white/35">
              {[
                [CheckCircle, "Verified Properties"],
                [Shield, "Secure Payments"],
                [Clock, "Fast Processing"],
              ].map(([Icon, label]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon size={12} className="text-emerald-400" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0" style={{ lineHeight: 0, marginBottom: "-2px" }}>
            <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", width: "100%" }}>
              <path d="M0 80H1440V40C1200 0 960 20 720 28C480 36 240 56 0 40V80Z" fill="#FDFAF5" />
            </svg>
          </div>
        </section>

        {/* ── WHY US ── */}
        <section className="py-16 sm:py-20 px-5 sm:px-10 bg-[#FDFAF5]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-amber-700 mb-2 block">
                Why {appname}
              </span>
              <h2
                className="font-bold text-[#0D1F1A]"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                }}
              >
                Simple. Secure. Transparent. Profitable.
              </h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {[
                { icon: <Shield size={22} />,    title: "Verified Lands",    desc: "Full documentation & title checks.",    accent: "#C8873A" },
                { icon: <Zap size={22} />,       title: "Flexible Payments", desc: "Multiple gateways for secure transactions.",       accent: "#2D7A55" },
                { icon: <FileCheck size={22} />, title: "Fast Processing",   desc: "Quick units transfer & documentation.", accent: "#8B5CF6" },
                { icon: <Users size={22} />,     title: "Expert Support",    desc: "Dedicated team, every step.",           accent: "#C8873A" },
              ].map((f) => (
                <div
                  key={f.title}
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-100 shadow-sm text-center group hover:shadow-md hover:-translate-y-1 transition-all"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"
                    style={{ background: `${f.accent}18`, color: f.accent }}
                  >
                    {f.icon}
                  </div>
                  <h3 className="font-bold text-[#0D1F1A] mb-1 text-sm sm:text-base">{f.title}</h3>
                  <p className="text-[#5C6B63] text-xs sm:text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURED PROPERTIES ── */}
        <section className="py-16 sm:py-20 px-5 sm:px-10 bg-[#0D1F1A]">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-8 sm:mb-10 flex-wrap gap-4">
              <div>
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-amber-500 mb-2 block">
                  Handpicked
                </span>
                <h2
                  className="font-bold text-white"
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                  }}
                >
                  Featured Properties
                </h2>
              </div>
              <Link
                href="/lands"
                className="flex items-center gap-1.5 text-amber-500 hover:text-amber-400 text-sm font-semibold transition-colors"
              >
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <FeaturedProperties lands={lands} />
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="py-16 sm:py-20 px-5 sm:px-10 bg-[#FDFAF5]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 sm:mb-10">
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-amber-700 mb-2 block">
                Investors
              </span>
              <h2
                className="font-bold text-[#0D1F1A]"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                }}
              >
                What They're Saying
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
              {[
                {
                  name: "Chidi Okonkwo",
                  role: "Business Owner, Abuja",
                  text: "I've invested in 3 properties so far. The process was smooth and the team is transparent.",
                  rating: 5,
                },
                {
                  name: "Amina Bello",
                  role: "Software Engineer, Lagos",
                  text: "The flexible payment plan made it easy to start. My land value has appreciated by 15%!",
                  rating: 5,
                },
              ].map((t, i) => (
                <blockquote
                  key={i}
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-sm"
                >
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(t.rating)].map((_, j) => (
                      <Star key={j} size={13} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-[#3D4D43] leading-relaxed mb-4 text-sm italic">"{t.text}"</p>
                  <footer>
                    <p className="font-bold text-[#0D1F1A] text-sm">{t.name}</p>
                    <p className="text-[#5C6B63] text-xs mt-0.5">{t.role}</p>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative py-16 sm:py-20 px-5 sm:px-10 bg-[#0D1F1A] overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[70vw] h-[35vh] opacity-15 rounded-full blur-3xl"
              style={{ background: "radial-gradient(ellipse, #C8873A 0%, transparent 70%)" }}
            />
          </div>
          <div className="relative z-10 max-w-xl mx-auto text-center">
            <Award size={36} className="mx-auto mb-4 text-amber-500" />
            <h2
              className="font-bold text-white mb-3 leading-tight"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
              }}
            >
              Ready to Build Your Wealth?
            </h2>
            <p className="text-white/45 mb-8 text-sm sm:text-base max-w-sm mx-auto">
              Join smart investors securing their future through verified land.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-[#0D1F1A] transition-all hover:scale-105 shadow-xl text-sm sm:text-base"
                style={{ background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }}
              >
                Start Investing{" "}
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/lands"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white border border-white/20 hover:bg-white/10 transition-all text-sm sm:text-base"
              >
                Browse Properties
              </Link>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-16 sm:py-20 px-5 sm:px-10 bg-[#FDFAF5]">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8 sm:mb-10">
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-amber-700 mb-2 block">FAQ</span>
              <h2
                className="font-bold text-[#0D1F1A]"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                }}
              >
                Common Questions
              </h2>
            </div>
            <FaqSection />
          </div>
        </section>

      </main>
    </>
  );
}