import { useState, useRef, useEffect, useCallback } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";
import { useCombobox } from "downshift";
import { getFileIcon } from "../utils/fileIcons";
import { formatFileSize } from "../utils/fileUtils";

interface SearchResult {
  path: string;
  name: string;
  isFile: boolean;
  size: number;
  modified: number;
}

interface SearchStartedEvent {
  event: "started";
  data: {
    query: string;
    searchId: number;
  };
}

interface SearchResultEvent {
  event: "result";
  data: SearchResult & {
    searchId: number;
  };
}

interface SearchFinishedEvent {
  event: "finished";
  data: {
    searchId: number;
    totalMatches: number;
    hasMore: boolean;
  };
}

type SearchEvent = SearchStartedEvent | SearchResultEvent | SearchFinishedEvent;

interface SearchState {
  results: SearchResult[];
  totalMatches: number;
  hasMore: boolean;
  isSearching: boolean;
}

export function SearchBox({
  currentPath,
  onNavigate,
}: {
  currentPath: string;
  onNavigate: (path: string) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [searchState, setSearchState] = useState<SearchState>({
    results: [],
    totalMatches: 0,
    hasMore: false,
    isSearching: false,
  });
  const searchIdRef = useRef(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const searchTimeoutRef = useRef<number>();
  const listRef = useRef<HTMLUListElement>(null);

  const {
    isOpen,
    getMenuProps,
    getInputProps,
    getItemProps,
    highlightedIndex,
    reset,
  } = useCombobox({
    items: searchState.results,
    inputValue,
    onInputValueChange: ({ inputValue }) => {
      setInputValue(inputValue || "");
      handleSearch(inputValue || "");
    },
    itemToString: (item) => item?.name || "",
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) {
        if (selectedItem.isFile) {
          console.log("Opening file:", selectedItem.path);
          // TODO: Implement file opening logic
        } else {
          onNavigate(selectedItem.path);
        }
        // Clear input after selection
        reset();
      }
    },
  });

  // Clear search when path changes
  useEffect(() => {
    reset();
  }, [currentPath, reset]);

  // Prevent propagation of Ctrl+A in input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "a") {
      e.stopPropagation();
    }
  };

  const handleSearch = (query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query) {
      setSearchState({
        results: [],
        totalMatches: 0,
        hasMore: false,
        isSearching: false,
      });
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchState((prev) => ({ ...prev, isSearching: true }));
      const searchId = ++searchIdRef.current;
      const channel = new Channel<SearchEvent>();

      channel.onmessage = (message: SearchEvent) => {
        if (searchId !== message.data.searchId) return;

        if (message.event === "result") {
          setSearchState((prev) => ({
            ...prev,
            results: [
              ...prev.results,
              {
                path: message.data.path,
                name: message.data.name,
                isFile: message.data.isFile,
                size: message.data.size,
                modified: message.data.modified,
              },
            ],
          }));
        } else if (message.event === "finished") {
          setSearchState((prev) => ({
            ...prev,
            isSearching: false,
            totalMatches: message.data.totalMatches,
            hasMore: message.data.hasMore,
          }));
        }
      };

      setSearchState((prev) => ({ ...prev, results: [] }));
      await invoke("search_files", {
        path: currentPath,
        query,
        searchId,
        onEvent: channel,
      });
    }, 300);
  };

  // Handle scroll to load more
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLUListElement>) => {
      const list = e.currentTarget;
      if (
        !loadingMore &&
        searchState.hasMore &&
        list.scrollHeight - list.scrollTop <= list.clientHeight + 100
      ) {
        handleLoadMore();
      }
    },
    [loadingMore, searchState.hasMore]
  );

  const handleLoadMore = async () => {
    if (loadingMore || !searchState.hasMore) return;

    setLoadingMore(true);
    const searchId = ++searchIdRef.current;
    const channel = new Channel<SearchEvent>();

    channel.onmessage = (message: SearchEvent) => {
      if (searchId !== message.data.searchId) return;

      if (message.event === "result") {
        setSearchState((prev) => ({
          ...prev,
          results: [
            ...prev.results,
            {
              path: message.data.path,
              name: message.data.name,
              isFile: message.data.isFile,
              size: message.data.size,
              modified: message.data.modified,
            },
          ],
        }));
      } else if (message.event === "finished") {
        setSearchState((prev) => ({
          ...prev,
          isSearching: false,
          totalMatches: message.data.totalMatches,
          hasMore: message.data.hasMore,
        }));
        setLoadingMore(false);
      }
    };

    await invoke("search_files", {
      path: currentPath,
      query: inputValue,
      searchId,
      onEvent: channel,
      skip: searchState.results.length,
    });
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          {...getInputProps({
            onKeyDown: handleKeyDown,
          })}
          className="w-full px-4 py-2.5 text-sm bg-white dark:bg-surface-100 border border-surface-200 dark:border-surface-200 
            rounded-xl shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500
            text-gray-900 dark:text-gray-100
            focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
            dark:focus:ring-primary-400/20 dark:focus:border-primary-400
            transition-colors"
          placeholder="Search files and folders..."
        />
        {searchState.isSearching ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary-500/20 dark:border-primary-400/20 border-t-primary-500 dark:border-t-primary-400 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            ⌘K
          </div>
        )}
      </div>

      <div {...getMenuProps()}>
        {isOpen && (
          <ul
            ref={listRef}
            onScroll={handleScroll}
            className="absolute z-50 w-full mt-2 bg-white dark:bg-surface-100 rounded-xl shadow-lg 
              border border-surface-200 dark:border-surface-200 overflow-hidden max-h-[60vh] overflow-auto"
          >
            {searchState.results.length === 0 ? (
              <li className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
                {searchState.isSearching
                  ? "Searching..."
                  : inputValue
                  ? "No results found"
                  : "Type to search files"}
              </li>
            ) : (
              <>
                {searchState.results.map((result, index) => {
                  const FileIcon = getFileIcon(result.name);

                  return (
                    <li
                      {...getItemProps({ item: result, index })}
                      key={result.path}
                      className={`group px-3 py-2 flex items-center space-x-3 cursor-pointer
                        transition-colors duration-150
                        ${
                          highlightedIndex === index
                            ? "bg-primary-50 dark:bg-primary-900/20"
                            : "hover:bg-surface-50 dark:hover:bg-surface-200"
                        }`}
                    >
                      <FileIcon
                        className={`w-5 h-5 flex-shrink-0 transition-colors
                          ${
                            highlightedIndex === index
                              ? "text-primary-500 dark:text-primary-400"
                              : "text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400"
                          }`}
                        weight="fill"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {result.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {result.path}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {formatFileSize(result.size)}
                      </div>
                    </li>
                  );
                })}
                {searchState.hasMore && (
                  <li className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500 bg-surface-50/50 dark:bg-surface-200/50 text-center border-t border-surface-200 dark:border-surface-300">
                    {loadingMore ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-primary-500/20 dark:border-primary-400/20 border-t-primary-500 dark:border-t-primary-400 rounded-full animate-spin" />
                        <span>Loading more results...</span>
                      </div>
                    ) : (
                      `${
                        searchState.totalMatches - searchState.results.length
                      } more results available...`
                    )}
                  </li>
                )}
              </>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
