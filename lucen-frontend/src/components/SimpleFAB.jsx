import { Plus } from "lucide-react";
import React from "react";

// export default function SimpleFAB() {
//   return (
//     <button className="fixed bottom-8 right-8 w-16 h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:ring-offset-0 group flex items-center justify-center">
//       <Plus className="w-6 h-6 text-gray-700 dark:text-gray-200 transition-transform duration-200 group-hover:rotate-90" />
//     </button>
//   );
// }

const SimpleFAB = React.forwardRef((props, ref) => {
  return (
    // We add the ref and spread the rest of the props onto the button
    <button
      ref={ref}
      {...props}
      className="fixed bottom-8 right-8 w-16 h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:ring-offset-0 group flex items-center justify-center"
    >
      <Plus className="w-6 h-6 text-gray-700 dark:text-gray-200 transition-transform duration-200 group-hover:rotate-90" />
    </button>
  );
});

// Add a display name for better debugging
SimpleFAB.displayName = "SimpleFAB";

export default SimpleFAB;
