import React from 'react';

export const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-32 h-32 mb-6 relative">
         <img 
            src="https://picsum.photos/400/400?grayscale&blur=2" 
            alt="Relaxed atmosphere" 
            className="w-full h-full object-cover rounded-full opacity-20"
         />
         <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">🧘</span>
         </div>
      </div>
      <h3 className="text-lg font-bold text-black mb-1 uppercase tracking-wide">All Clear</h3>
      <p className="text-xs text-gray-500 max-w-sm font-medium uppercase tracking-wider leading-relaxed">
        Use the Command Center to add tasks, or try: <br/>
        <span className="text-black">"Add a meeting tomorrow"</span><br/>
        <span className="text-black">"Clear all work tasks"</span>
      </p>
    </div>
  );
};