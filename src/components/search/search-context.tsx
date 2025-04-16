import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { TrieSearch } from "../../utils/TrieSearch";
import { TicketType } from "../../types";

interface SearchContextProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isFiltered: boolean;
  searchTrie: TrieSearch;
  addToSearchIndex: (ticket: TicketType) => void;
  removeFromSearchIndex: (ticketId: string) => void;
  updateSearchIndex: (ticket: TicketType) => void;
  resetSearchIndex: (tickets: TicketType[]) => void;
  isTicketVisible: (ticketId: string) => boolean;
}

const SearchContext = createContext<SearchContextProps>({
  searchTerm: "",
  setSearchTerm: () => {},
  isFiltered: false,
  searchTrie: new TrieSearch(),
  addToSearchIndex: () => {},
  removeFromSearchIndex: () => {},
  updateSearchIndex: () => {},
  resetSearchIndex: () => {},
  isTicketVisible: () => true,
});

type TicketMap = Map<string, string>;

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFiltered, setIsFiltered] = useState(false);
  const [searchTrie] = useState(() => new TrieSearch(2));
  const [ticketMap] = useState<TicketMap>(() => new Map());
  const [visibleTickets, setVisibleTickets] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!searchTerm) {
      setIsFiltered(false);
      setVisibleTickets(new Set([...ticketMap.keys()]));
      return;
    }

    setIsFiltered(true);
    const matchingTickets = searchTrie.search(searchTerm);
    setVisibleTickets(new Set(matchingTickets));
  }, [searchTerm, searchTrie, ticketMap]);

  const addToSearchIndex = useCallback(
    (ticket: TicketType) => {
      const ticketId = ticket.ticketId;
      const ticketName = ticket.name;

      ticketMap.set(ticketId, ticketName);

      searchTrie.insert(ticketName, ticketId);

      if (!searchTerm) {
        setVisibleTickets((prev) => new Set([...prev, ticketId]));
      } else if (searchTrie.matches(ticketName, searchTerm)) {
        setVisibleTickets((prev) => new Set([...prev, ticketId]));
      }
    },
    [searchTerm, searchTrie, ticketMap]
  );

  const removeFromSearchIndex = useCallback(
    (ticketId: string) => {
      if (ticketMap.has(ticketId)) {
        ticketMap.delete(ticketId);

        searchTrie.clear();
        ticketMap.forEach((name, id) => {
          searchTrie.insert(name, id);
        });

        setVisibleTickets((prev) => {
          const newSet = new Set(prev);
          newSet.delete(ticketId);
          return newSet;
        });
      }
    },
    [searchTrie, ticketMap]
  );

  const updateSearchIndex = useCallback(
    (ticket: TicketType) => {
      removeFromSearchIndex(ticket.ticketId);
      addToSearchIndex(ticket);
    },
    [addToSearchIndex, removeFromSearchIndex]
  );

  const resetSearchIndex = useCallback(
    (tickets: TicketType[]) => {
      ticketMap.clear();
      searchTrie.clear();

      tickets.forEach((ticket) => {
        ticketMap.set(ticket.ticketId, ticket.name);
        searchTrie.insert(ticket.name, ticket.ticketId);
      });

      if (!searchTerm) {
        setVisibleTickets(new Set([...ticketMap.keys()]));
      } else {
        const matchingTickets = searchTrie.search(searchTerm);
        setVisibleTickets(new Set(matchingTickets));
      }
    },
    [searchTerm, searchTrie, ticketMap]
  );

  const isTicketVisible = useCallback(
    (ticketId: string) => {
      return visibleTickets.has(ticketId);
    },
    [visibleTickets]
  );

  const contextValue: SearchContextProps = {
    searchTerm,
    setSearchTerm,
    isFiltered,
    searchTrie,
    addToSearchIndex,
    removeFromSearchIndex,
    updateSearchIndex,
    resetSearchIndex,
    isTicketVisible,
  };

  return (
    <SearchContext.Provider value={contextValue}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => useContext(SearchContext);
