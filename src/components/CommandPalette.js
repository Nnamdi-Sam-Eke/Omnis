import { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  // Award, 
  LogOut, 
  Plus,
  Search,
  Command
} from 'lucide-react';

// Icon map for rendering icons from string identifiers
const iconMap = {
  TrendingUp: <TrendingUp size={16} />,
  // Award: <Award size={16} />,
  Plus: <Plus size={16} />,
  LogOut: <LogOut size={16} />,
};

// Base command definitions with icon identifiers and actions
const baseCommands = [
  {
    name: 'Go to Quick Stats',
    icon: 'TrendingUp',
    action: (setTab) => setTab('quickStats'),
  },
  // {
  //   name: 'Go to Achievements',
  //   icon: 'Award',
  //   action: (setTab) => setTab('achievements'),
  // },
  {
    name: 'Create New Scenario',
    icon: 'Plus',
    action: () => console.log('Creating...'),
  },
  {
    name: 'Logout',
    icon: 'LogOut',
    action: () => console.log('Logging out...'),
  },
];

// Simple fuzzy search function (replaces Fuse.js)
function fuzzySearch(commands, query) {
  if (!query) return commands;
  
  return commands.filter(command => {
    const name = command.name.toLowerCase();
    const searchQuery = query.toLowerCase();
    
    // Check if all characters in query appear in order in the command name
    let queryIndex = 0;
    for (let i = 0; i < name.length && queryIndex < searchQuery.length; i++) {
      if (name[i] === searchQuery[queryIndex]) {
        queryIndex++;
      }
    }
    
    return queryIndex === searchQuery.length || name.includes(searchQuery);
  });
}

export default function CommandPalette({ setActiveTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(baseCommands);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [recent, setRecent] = useState([]);

  // Initialize recent commands (using in-memory storage)
  useEffect(() => {
    setRecent(baseCommands.slice(0, 3)); // Initialize with first 3 commands
  }, []);

  // Update search results when query changes
  useEffect(() => {
    if (!query) {
      setResults(baseCommands);
    } else {
      const searchResults = fuzzySearch(baseCommands, query);
      setResults(searchResults);
    }
    setHighlightedIndex(0);
  }, [query]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Open/close with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        return;
      }

      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          setIsOpen(false);
          setQuery('');
          break;
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (results[highlightedIndex]) {
            executeCommand(results[highlightedIndex]);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, highlightedIndex]);

  const executeCommand = (command) => {
    // Add to recent commands (keep last 5)
    setRecent(prev => {
      const filtered = prev.filter(cmd => cmd.name !== command.name);
      return [command, ...filtered].slice(0, 5);
    });

    // Execute the command action
    command.action(setActiveTab);
    
    // Close palette
    setIsOpen(false);
    setQuery('');
  };

  const displayCommands = query ? results : [...recent, ...baseCommands.filter(cmd => !recent.some(r => r.name === cmd.name))];

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 p-2 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
      >
        <Command size={16} />
        <span className="text-sm">⌘K</span>
      </button>

      {/* Command Palette Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50  backdrop-blur-lg flex items-start justify-center pt-20 z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg mx-4">
            {/* Search Input */}
            <div className="flex items-center gap-3 p-4 border-b">
              <Search className="text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search commands..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 outline-none text-lg"
                autoFocus
              />
              <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {!query && recent.length > 0 && (
                <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                  Recent
                </div>
              )}
              
              {displayCommands.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No commands found
                </div>
              ) : (
                displayCommands.map((command, index) => (
                  <button
                    key={command.name}
                    onClick={() => executeCommand(command)}
                    className={`w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors ${
                      index === highlightedIndex ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="text-gray-600">
                      {iconMap[command.icon]}
                    </div>
                    <span className="flex-1">{command.name}</span>
                    {recent.some(r => r.name === command.name) && !query && (
                      <span className="text-xs text-gray-400">Recent</span>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>ESC Close</span>
              </div>
              <span>⌘K to toggle</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}