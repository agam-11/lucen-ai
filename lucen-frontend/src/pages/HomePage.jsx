// src/pages/HomePage.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

// These SVG icon components are fine, no changes needed
const KeywordIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mx-auto mb-4 text-blue-600"
  >
    <path d="M12 20h9" />
    <path d="M4 12v-2a6 6 0 1 1 12 0v2" />
    <path d="m8 12 4 4 4-4" />
    <path d="M12 16V4" />
  </svg>
);
const AnalysisIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mx-auto mb-4 text-blue-600"
  >
    <path d="M20 12V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4" />
    <path d="m14 18 2-2-2-2" />
    <path d="m20 12-2 2-2-2" />
  </svg>
);
const DraftingIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mx-auto mb-4 text-blue-600"
  >
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2Z" />
    <path d="M15 2v20" />
    <path d="M8 7h4" />
    <path d="M8 12h4" />
    <path d="M8 17h4" />
  </svg>
);

function HomePage() {
  return (
    // The main wrapper uses the default theme background and text colors
    <div className="bg-background text-foreground">
      {/* Header */}
      <header className="absolute top-0 left-0 w-full z-10 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">Lucen AI</h1>
          <Link to="/dashboard">
            <Button variant="outline">Login / Dashboard</Button>
          </Link>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative h-screen flex items-center justify-center text-center overflow-hidden bg-white">
          {/* --- THIS IS THE NEW BACKGROUND EFFECT --- */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 flex items-center justify-center"
          >
            {/* Blue Glow */}
            <div className="absolute right-[10%] top-[20%] h-[300px] w-[300px] bg-blue-300 rounded-full blur-3xl opacity-20 animate-pulse"></div>
            {/* Purple/Pink Glow */}
            <div className="absolute left-[15%] bottom-[25%] h-[250px] w-[250px] bg-purple-300 rounded-full blur-3xl opacity-15 animate-pulse [animation-delay:2s]"></div>
          </div>
          {/* --- END OF NEW BACKGROUND EFFECT --- */}

          {/* Subtle background pattern */}
          {/* <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div> */}

          <div className="relative z-10 px-4">
            <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4 text-slate-900">
              Accelerate Your Patent Workflow
            </h2>
            <p className="max-w-3xl mx-auto text-lg md:text-xl text-slate-600 mb-8">
              Lucen AI is a powerful assistant for patent professionals,
              leveraging AI to streamline prior art searches, analysis, and
              initial drafting.
            </p>

            {/* A clean, professional primary button for light mode */}
            <Button
              size="lg"
              className="text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              asChild
            >
              <Link to="/dashboard">Get Started</Link>
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h3 className="text-4xl font-bold text-slate-900">
                A Smarter Way to Work
              </h3>
              <p className="text-lg text-slate-500 mt-2">
                Core features designed to save you time.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="bg-white p-8 rounded-xl shadow-md transition-all hover:shadow-lg hover:-translate-y-1">
                <KeywordIcon />
                <h4 className="text-2xl font-semibold mb-2 text-slate-900">
                  AI Keyword Suggestion
                </h4>
                <p className="text-slate-600">
                  Automatically analyze invention disclosures to extract
                  relevant technical keywords for prior art searches.
                </p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-md transition-all hover:shadow-lg hover:-translate-y-1">
                <AnalysisIcon />
                <h4 className="text-2xl font-semibold mb-2 text-slate-900">
                  Prior Art Analysis
                </h4>
                <p className="text-slate-600">
                  Use AI to analyze search results, providing concise summaries,
                  comparisons, and similarity scores.
                </p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-md transition-all hover:shadow-lg hover:-translate-y-1">
                <DraftingIcon />
                <h4 className="text-2xl font-semibold mb-2 text-slate-900">
                  AI-Assisted Drafting
                </h4>
                <p className="text-slate-600">
                  Generate high-quality first drafts for patent application
                  sections like the Background and Summary.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default HomePage;
