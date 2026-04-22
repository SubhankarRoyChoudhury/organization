"use client";

import { useEffect, useState } from "react";

const slides = [
  {
    title: "Practical teaching &",
    accent: "Social Development",
    description:
      "We aim at success by creating skills necessary for kids to enrich and empower in studies and sports.",
    cta: "Learn More",
    image: "https://picsum.photos/seed/kids-circle/1800/1100",
  },
  {
    title: "Fun In School",
    accent: "Creative Learning",
    points: [
      "Creative lesson plans",
      "1,000+ worksheets and craft sheets",
      "Weekly academic training for kids",
      "Universal workshop programs",
    ],
    cta: "View Programs",
    image: "https://picsum.photos/seed/school-bag/1800/1100",
  },
  {
    title: "Future Ready",
    accent: "Smart Classrooms",
    description:
      "Balanced academics, activities, and care-focused mentoring to build confidence in every child.",
    cta: "Explore Now",
    image: "https://picsum.photos/seed/classroom-fun/1800/1100",
  },
];

const aboutHighlights = [
  { title: "Our Team", tone: "bg-[#f2b100]", kind: "team" },
  { title: "Kids Enrollment", tone: "bg-[#ff2a8a]", kind: "enroll" },
  { title: "Alumni Club", tone: "bg-[#58b9f0]", kind: "alumni" },
  { title: "Best Amenities", tone: "bg-[#9fbe45]", kind: "amenities" },
];

const facilityCards = [
  {
    title: "Digital Classrooms",
    text: "Smart boards and interactive tools for active learning.",
    icon: "💻",
    tone: "from-[#57c5c7] to-[#3ea7aa]",
  },
  {
    title: "Sports Arena",
    text: "Indoor and outdoor activities for holistic growth.",
    icon: "⚽",
    tone: "from-[#f39a00] to-[#e38500]",
  },
  {
    title: "Science Labs",
    text: "Modern labs for experimentation and discovery.",
    icon: "🔬",
    tone: "from-[#6e59d9] to-[#5f4dc2]",
  },
  {
    title: "Library Hub",
    text: "Rich reading spaces that build curiosity and language.",
    icon: "📚",
    tone: "from-[#9fbe45] to-[#86a531]",
  },
];

const blogCards = [
  {
    title: "5 Ways to Build Reading Habits in Kids",
    excerpt: "Simple routines that make reading fun and consistent at home.",
    image: "https://picsum.photos/seed/blog-reading/700/480",
    date: "Mar 06, 2026",
  },
  {
    title: "How Practical Learning Improves Confidence",
    excerpt: "Why hands-on classroom experiences shape stronger learners.",
    image: "https://picsum.photos/seed/blog-practical/700/480",
    date: "Feb 28, 2026",
  },
  {
    title: "Parent-School Collaboration That Works",
    excerpt: "Actionable communication ideas for better student outcomes.",
    image: "https://picsum.photos/seed/blog-parent/700/480",
    date: "Feb 21, 2026",
  },
];

const collageImages = [
  "https://picsum.photos/seed/fam-tech/700/650",
  "https://picsum.photos/seed/students-group/540/420",
  "https://picsum.photos/seed/kid-dance/600/780",
  "https://picsum.photos/seed/graduation/520/520",
];

function AboutBadgeIcon({ kind }) {
  if (kind === "team") {
    return (
      <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M8.5 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
        <path d="M15.5 12a2.5 2.5 0 1 0 0-5" />
        <path d="M3.5 19a5 5 0 0 1 10 0" />
        <path d="M14 19c.3-1.7 1.6-3 3.3-3.4" />
      </svg>
    );
  }

  if (kind === "enroll") {
    return (
      <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="m12 3 7 4v10l-7 4-7-4V7l7-4Z" />
        <path d="M12 7v10" />
        <path d="M7 10.2 12 13l5-2.8" />
      </svg>
    );
  }

  if (kind === "alumni") {
    return (
      <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="7.5" r="3.2" />
        <path d="M5.8 19.5v-1.3a6.2 6.2 0 0 1 12.4 0v1.3" />
        <path d="M7 19.5h10" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19V9" />
      <path d="M20 19V9" />
      <path d="M2 9h20" />
      <path d="M5 5h14" />
      <path d="M8 19v-4" />
      <path d="M12 19v-4" />
      <path d="M16 19v-4" />
    </svg>
  );
}

export default function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [aboutIndex, setAboutIndex] = useState(0);

  useEffect(() => {
    if (isPaused) {
      return undefined;
    }

    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused]);

  const goPrev = () => {
    setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goNext = () => {
    setActiveSlide((prev) => (prev + 1) % slides.length);
  };

  const goAboutPrev = () => {
    setAboutIndex(
      (prev) => (prev - 1 + aboutHighlights.length) % aboutHighlights.length,
    );
  };

  const goAboutNext = () => {
    setAboutIndex((prev) => (prev + 1) % aboutHighlights.length);
  };

  const orderedAboutHighlights = aboutHighlights.map(
    (_, idx) => aboutHighlights[(idx + aboutIndex) % aboutHighlights.length],
  );

  return (
    <main className="bg-[#f2f2f2] text-[#171717]">
      <section
        id="home"
        className="relative overflow-hidden bg-[#e8ebf4] scroll-mt-24"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="relative min-h-[560px] md:min-h-[680px]">
          {slides.map((slide, index) => (
            <article
              key={slide.title}
              className={`absolute inset-0 transition-all duration-700 ease-out ${
                index === activeSlide
                  ? "translate-x-0 opacity-100"
                  : "pointer-events-none translate-x-4 opacity-0"
              }`}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${slide.image})` }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(236,240,248,0.16)_0%,rgba(236,240,248,0.72)_48%,rgba(236,240,248,0.94)_100%)]" />

              <div className="relative z-10 mx-auto grid h-full max-w-[1320px] md:grid-cols-[1fr_1fr]">
                <div className="hidden md:block" />

                <div className="flex items-center px-6 py-14 sm:px-10 lg:px-14">
                  <div
                    className={`relative max-w-[580px] transition-all duration-700 ${
                      index === activeSlide
                        ? "translate-y-0 opacity-100"
                        : "translate-y-3 opacity-0"
                    }`}
                  >
                    <span className="absolute -left-8 -top-12 h-44 w-60 rounded-[42%_58%_55%_45%/56%_44%_56%_44%] bg-[#f0d945]/95" />

                    <h1 className="relative text-4xl font-extrabold leading-tight tracking-[-0.02em] text-[#6b2bc5] sm:text-5xl lg:text-6xl">
                      {slide.title}
                      <span className="mt-1 block text-[#f39a00]">{slide.accent}</span>
                    </h1>

                    {slide.points ? (
                      <ul className="relative mt-7 space-y-2 text-lg text-[#262626] sm:text-xl">
                        {slide.points.map((point) => (
                          <li key={point} className="flex items-start gap-3">
                            <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-[#6b2bc5]" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="relative mt-7 max-w-[540px] text-lg leading-relaxed text-[#1f1f1f] sm:text-xl">
                        {slide.description}
                      </p>
                    )}

                    <button
                      type="button"
                      className="relative mt-9 rounded-full bg-black px-10 py-3.5 text-base font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5"
                    >
                      {slide.cta}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}

          <button
            type="button"
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-black/20 text-2xl text-white backdrop-blur-sm transition hover:bg-black/40 md:grid"
            onClick={goPrev}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next slide"
            className="absolute right-4 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-black/20 text-2xl text-white backdrop-blur-sm transition hover:bg-black/40 md:grid"
            onClick={goNext}
          >
            ›
          </button>

          <div className="pointer-events-none absolute right-6 top-2 hidden h-52 w-64 lg:block">
            <span className="hero-color-stick hero-color-stick-1 absolute right-2 top-2 h-5 w-36 rotate-[-36deg] rounded-full bg-[#4f46e5]/90 blur-[1px]" />
            <span className="hero-color-stick hero-color-stick-2 absolute right-16 top-8 h-4 w-24 rotate-[-39deg] rounded-full bg-[#ef476f]/95" />
            <span className="hero-color-stick hero-color-stick-3 absolute right-[-6px] top-14 h-6 w-28 rotate-[-37deg] rounded-full bg-[#f3c623]" />
            <span className="hero-color-stick hero-color-stick-4 absolute right-[18px] top-[112px] h-6 w-16 rotate-[-36deg] rounded-full bg-[#ff2a8a]" />
            <span className="hero-color-stick hero-color-stick-5 absolute right-[-8px] top-[136px] h-7 w-32 rotate-[-37deg] rounded-full bg-[#40d6a5]" />
          </div>

          <div className="absolute bottom-20 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3">
            {slides.map((_, dotIndex) => (
              <button
                key={`fixed-dot-${dotIndex}`}
                type="button"
                aria-label={`Go to slide ${dotIndex + 1}`}
                className={`h-3.5 w-3.5 rounded-full border-2 border-[#ff2f8d] transition ${
                  dotIndex === activeSlide ? "bg-[#ff2f8d]" : "bg-transparent"
                }`}
                onClick={() => setActiveSlide(dotIndex)}
              />
            ))}
          </div>

        </div>
      </section>

      <section id="about" className="relative scroll-mt-24 overflow-hidden bg-[#a9d4ec] px-6 py-24 md:px-10">
        <div className="pointer-events-none absolute inset-x-0 -top-16 h-16 overflow-hidden">
          <svg viewBox="0 0 1440 160" preserveAspectRatio="none" className="h-full w-full">
            <path fill="#a9d4ec" d="M0 28 Q720 108 1440 28 L1440 160 L0 160 Z" />
          </svg>
        </div>

        <header className="relative z-10 mb-14 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#2f6f93]">
            About Us
          </p>
          <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.02em] text-[#1f2730] sm:text-5xl">
            Growing Together With Purpose
          </h2>
        </header>

        <button
          type="button"
          aria-label="Previous about item"
          className="absolute left-4 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md bg-[#373e45] text-2xl text-white/90 md:flex"
          onClick={goAboutPrev}
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Next about item"
          className="absolute right-4 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md bg-[#373e45] text-2xl text-white/90 md:flex"
          onClick={goAboutNext}
        >
          ›
        </button>

        <div className="relative mx-auto max-w-[1180px]">
          <div className="grid gap-12 sm:grid-cols-2 md:grid-cols-4 md:gap-8">
            {orderedAboutHighlights.map((item) => (
              <article
                key={`${item.title}-${aboutIndex}`}
                className="text-center transition-transform duration-300 ease-out"
              >
                <div
                  className={`mx-auto grid h-24 w-24 place-items-center rounded-full text-white shadow-[0_10px_24px_rgba(0,0,0,0.12)] ${item.tone}`}
                >
                  <AboutBadgeIcon kind={item.kind} />
                </div>
                <h3 className="mt-6 text-3xl font-semibold tracking-[-0.015em] text-[#1f2730]">
                  {item.title}
                </h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="facilities" className="scroll-mt-24 bg-[#f5f5f5] px-6 py-24 md:px-12">
        <div className="mx-auto max-w-[1240px]">
          <header className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#828282]">
              Facilities
            </p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.02em] text-[#1d1d1d] sm:text-5xl">
              Everything Kids Need To Thrive
            </h2>
          </header>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {facilityCards.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-[#ececec] bg-white p-6 shadow-[0_10px_24px_rgba(0,0,0,0.06)] transition-transform duration-300 hover:-translate-y-1"
              >
                <div
                  className={`grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br text-2xl text-white ${item.tone}`}
                >
                  {item.icon}
                </div>
                <h3 className="mt-5 text-xl font-bold text-[#222222]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#666666]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="blog" className="scroll-mt-24 bg-[#ffffff] px-6 py-24 md:px-12">
        <div className="mx-auto max-w-[1240px]">
          <header className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8a8a8a]">
              Blog
            </p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.02em] text-[#1c1c1c] sm:text-5xl">
              Latest School Stories
            </h2>
          </header>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {blogCards.map((post, index) => {
              const staggerClass = index % 2 === 0 ? "md:-translate-y-4" : "md:translate-y-4";

              return (
                <article
                  key={post.title}
                  className={`overflow-hidden rounded-2xl border border-[#ececec] bg-white shadow-[0_14px_24px_rgba(0,0,0,0.08)] transition-transform duration-300 ${staggerClass}`}
                >
                  <div
                    className="h-48 w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${post.image})` }}
                  />
                  <div className="p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a9a9a]">
                      {post.date}
                    </p>
                    <h3 className="mt-3 text-xl font-bold leading-snug text-[#1e1e1e]">
                      {post.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[#686868]">{post.excerpt}</p>
                    <button type="button" className="mt-5 text-sm font-semibold text-[#5c40c8]">
                      Read More
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-24 bg-[#f3f3f3] px-6 py-24 md:px-12">
        <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[1.02fr_1fr]">
          <div className="grid grid-cols-[1.05fr_0.78fr] gap-4 sm:gap-5">
            <div
              className="h-[300px] rounded-3xl bg-cover bg-center sm:h-[340px]"
              style={{ backgroundImage: `url(${collageImages[0]})` }}
            />
            <div
              className="h-[300px] rounded-3xl bg-cover bg-center sm:h-[340px]"
              style={{ backgroundImage: `url(${collageImages[1]})` }}
            />
            <div
              className="h-[340px] rounded-3xl bg-cover bg-center sm:h-[420px]"
              style={{ backgroundImage: `url(${collageImages[2]})` }}
            />
            <div
              className="h-[300px] self-start rounded-3xl bg-cover bg-center sm:h-[340px]"
              style={{ backgroundImage: `url(${collageImages[3]})` }}
            />
          </div>

          <div className="rounded-2xl border border-[#ececec] bg-white/75 p-8 shadow-[0_14px_24px_rgba(0,0,0,0.06)] md:p-10">
            <h2 className="text-3xl font-extrabold tracking-[-0.02em] text-[#242424] md:text-4xl">
              Contact Us
            </h2>
            <p className="mt-2 text-sm text-[#767676]">
              Ask about admissions, classes, and activity programs.
            </p>

            <form className="mt-7 space-y-4">
              <input
                className="h-14 w-full rounded-full border border-[#e0e0e0] bg-white px-5 text-base outline-none placeholder:text-[#8a8a8a]"
                placeholder="Your Name"
              />
              <input
                className="h-14 w-full rounded-full border border-[#e0e0e0] bg-white px-5 text-base outline-none placeholder:text-[#8a8a8a]"
                placeholder="Email Address"
              />
              <input
                className="h-14 w-full rounded-full border border-[#e0e0e0] bg-white px-5 text-base outline-none placeholder:text-[#8a8a8a]"
                placeholder="Phone Number"
              />
              <select className="h-14 w-full rounded-full border border-[#e0e0e0] bg-white px-5 text-base text-[#8a8a8a] outline-none">
                <option>Studying Class</option>
                <option>Kinder (3-6)</option>
                <option>Elementary School</option>
                <option>Middle (10-16)</option>
              </select>
              <textarea
                className="h-28 w-full rounded-3xl border border-[#e0e0e0] bg-white px-5 py-4 text-base outline-none placeholder:text-[#8a8a8a]"
                placeholder="Type your requirements"
              />
              <button
                type="submit"
                className="h-14 w-full rounded-full bg-[#f1b100] text-lg font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5"
              >
                Submit Now
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
