import { useState, useRef, useEffect } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";
import { useCombobox } from "downshift";
import { getFileIcon } from "../utils/fileIcons";
import { formatFileSize, formatDate } from "../utils/fileUtils";

interface SearchResult {
  path: string;
  name: string;
  isFile: boolean;
  size: number;
  modified: number;
}

interface SearchEvent {
  event: "started" | "result" | "finished";
  data:
    | {
        query: string;
        searchId: number;
      }
    | {
        searchId: number;
        path: string;
        name: string;
        isFile: boolean;
        size: number;
        modified: number;
      }
    | {
        searchId: number;
        totalMatches: number;
      };
}

export function SearchBox({
  currentPath,
  onNavigate,
}: {
  currentPath: string;
  onNavigate: (path: string) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchIdRef = useRef(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    isOpen,
    getMenuProps,
    getInputProps,
    getItemProps,
    highlightedIndex,
  } = useCombobox({
    items: results,
    inputValue,
    onInputValueChange: ({ inputValue }) => {
      setInputValue(inputValue || "");
      handleSearch(inputValue || "");
    },
    itemToString: (item) => item?.name || "",
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) {
        onNavigate(selectedItem.path);
      }
    },
  });

  const handleSearch = (query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      const searchId = ++searchIdRef.current;
      const channel = new Channel<SearchEvent>();

      channel.onmessage = (message) => {
        if (message.event === "result" && searchId === message.data.searchId) {
          setResults((prev) => [...prev, message.data]);
        } else if (
          message.event === "finished" &&
          searchId === message.data.searchId
        ) {
          setIsSearching(false);
        }
      };

      setResults([]);
      await invoke("search_files", {
        path: currentPath,
        query,
        searchId,
        onEvent: channel,
      });
    }, 300);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          {...getInputProps()}
          className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          placeholder="Search files..."
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div {...getMenuProps()}>
        {isOpen && (
          <ul className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-96 overflow-auto">
            {results.map((result, index) => {
              const FileIcon = getFileIcon(result.name);

              return (
                <li
                  {...getItemProps({ item: result, index })}
                  key={result.path}
                  className={`px-4 py-2 flex items-center space-x-3 cursor-pointer ${
                    highlightedIndex === index ? "bg-blue-50" : ""
                  }`}
                >
                  <FileIcon
                    className="w-5 h-5 text-gray-500 flex-shrink-0"
                    weight="fill"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {result.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {result.path}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {formatFileSize(result.size)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
