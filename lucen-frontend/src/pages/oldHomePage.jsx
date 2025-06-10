// src/pages/HomePage.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button"; // Import the shadcn Button
import GlassmorphicButton from "@/components/GlassmorphicButtonDark";

// Simple SVG icons for features
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
    className="mx-auto mb-4 text-blue-500"
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
    className="mx-auto mb-4 text-blue-500"
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
    className="mx-auto mb-4 text-blue-500"
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
    <div>
      {/* Header */}
      <header className="absolute top-0 left-0 w-full z-10 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Lucen AI</h1>
          <Link to="/dashboard">
            <Button variant="outline">Login / Dashboard</Button>
          </Link>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative h-screen flex items-center justify-center text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950 opacity-50"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_400px_at_50%_300px,#3b82f633,transparent)]"></div>
          <div className="relative z-10 px-4">
            <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4">
              Accelerate Your Patent Workflow
            </h2>
            <p className="max-w-3xl mx-auto text-lg md:text-xl text-slate-300 mb-8">
              Lucen AI is a powerful assistant for patent professionals,
              leveraging AI to streamline prior art searches, analysis, and
              initial drafting.
            </p>
            {/* <Link to="/dashboard">
              <Button size="lg" className="text-lg">
                Get Started
              </Button>
            </Link> */}
            {/* <Button
              size="lg"
              className="
                text-lg font-regular
                bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 
                bg-[length:200%_auto] 
                text-slate-200 
                border border-slate-700
                shadow-lg
                transition-all duration-500 ease-out 
                hover:bg-[right_center] hover:shadow-blue-500/50 hover:text-white"
              asChild
            >
              <Link to="/dashboard">Get Started</Link>
            </Button> */}
            <Link to="/dashboard">
              <GlassmorphicButton />
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h3 className="text-4xl font-bold">A Smarter Way to Work</h3>
              <p className="text-lg text-slate-400 mt-2">
                Core features designed to save you time.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="bg-slate-900 p-8 rounded-xl border border-slate-800">
                <KeywordIcon />
                <h4 className="text-2xl font-semibold mb-2">
                  AI Keyword Suggestion
                </h4>
                <p className="text-slate-400">
                  Automatically analyze invention disclosures to extract
                  relevant technical keywords for prior art searches.
                </p>
              </div>
              <div className="bg-slate-900 p-8 rounded-xl border border-slate-800">
                <AnalysisIcon />
                <h4 className="text-2xl font-semibold mb-2">
                  Prior Art Analysis
                </h4>
                <p className="text-slate-400">
                  Use AI to analyze search results, providing concise summaries,
                  comparisons, and similarity scores.
                </p>
              </div>
              <div className="bg-slate-900 p-8 rounded-xl border border-slate-800">
                <DraftingIcon />
                <h4 className="text-2xl font-semibold mb-2">
                  AI-Assisted Drafting
                </h4>
                <p className="text-slate-400">
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
