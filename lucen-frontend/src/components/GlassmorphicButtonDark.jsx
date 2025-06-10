import { ArrowRight } from "lucide-react";

export default function GlassmorphicButton() {
  return (
    <button className="group relative inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white transition-all duration-300 ease-out transform hover:scale-105 focus:outline-none focus:ring-0 focus:ring-white/20 focus:ring-offset-0 focus:ring-offset-transparent">
      {/* Glassmorphic background */}
      <div className="absolute inset-0 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl transition-all duration-300 group-hover:bg-white/20 group-hover:border-white/30 group-hover:shadow-[0_0_40px_rgba(255,255,255,0.1)]" />

      {/* Gradient overlay for extra depth */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/5 to-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Button content */}
      <span className="relative flex items-center gap-2">
        Get Started
        <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
      </span>

      {/* Shine effect */}
      <div className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000" />
      </div>
    </button>
  );
}
