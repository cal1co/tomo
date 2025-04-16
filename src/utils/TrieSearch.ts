/**
 * A class for fuzzy searching text through both substring matching
 * and Levenshtein distance calculation, supporting multiple IDs per text
 */
export class TrieSearch {
    private wordMap: Map<string, string>; // Maps IDs to text content
    private contentMap: Map<string, Set<string>>; // Maps lowercase text to sets of IDs
    private maxDistance: number;
  
    constructor(maxDistance: number = 2) {
      this.wordMap = new Map();
      this.contentMap = new Map();
      this.maxDistance = maxDistance;
    }
  
    /**
     * Inserts a word into the search index
     * @param text The text to index (like a ticket name)
     * @param id The ID associated with the text
     */
    insert(text: string, id: string): void {
      const lowerCaseText = text.toLowerCase();
      
      // Store the mapping from ID to text
      this.wordMap.set(id, text);
      
      // Store the mapping from lowercase text to ID
      if (!this.contentMap.has(lowerCaseText)) {
        this.contentMap.set(lowerCaseText, new Set<string>());
      }
      
      // Using a Set ensures we don't have duplicate IDs
      this.contentMap.get(lowerCaseText)?.add(id);
    }
  
    /**
     * Searches for ids that match the query
     * @param query The search query
     * @returns Array of IDs that match the query
     */
    search(query: string): string[] {
      if (!query) {
        // Return all IDs when query is empty
        return Array.from(this.wordMap.keys());
      }
      
      const lowerCaseQuery = query.toLowerCase();
      const result = new Set<string>();
      
      // First do a simple substring match, which is more intuitive for users
      for (const [text, ids] of this.contentMap.entries()) {
        if (text.includes(lowerCaseQuery)) {
          ids.forEach(id => result.add(id));
        }
      }
      
      // If we have results from substring matching, return them
      if (result.size > 0) {
        return Array.from(result);
      }
      
      // Otherwise, fall back to Levenshtein distance (fuzzy match)
      for (const [text, ids] of this.contentMap.entries()) {
        if (this.calculateLevenshteinDistance(text, lowerCaseQuery) <= this.maxDistance) {
          ids.forEach(id => result.add(id));
        }
      }
      
      return Array.from(result);
    }
    
    /**
     * Calculate Levenshtein distance between two strings
     * @param s1 First string
     * @param s2 Second string
     * @returns Distance between the strings
     */
    private calculateLevenshteinDistance(s1: string, s2: string): number {
      // Early exit for empty strings or exact matches
      if (s1 === s2) return 0;
      if (s1.length === 0) return s2.length;
      if (s2.length === 0) return s1.length;
      
      // Optimization for very different length strings
      if (Math.abs(s1.length - s2.length) > this.maxDistance) {
        return Math.max(s1.length, s2.length);
      }
      
      // Create 2D matrix
      const track = Array(s2.length + 1).fill(null).map(() => 
        Array(s1.length + 1).fill(null));
      
      // Initialize first row and column
      for (let i = 0; i <= s1.length; i++) {
        track[0][i] = i;
      }
      
      for (let j = 0; j <= s2.length; j++) {
        track[j][0] = j;
      }
      
      // Fill in the rest of the matrix
      for (let j = 1; j <= s2.length; j++) {
        for (let i = 1; i <= s1.length; i++) {
          const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
          track[j][i] = Math.min(
            track[j][i - 1] + 1, // deletion
            track[j - 1][i] + 1, // insertion
            track[j - 1][i - 1] + indicator // substitution
          );
        }
      }
      
      return track[s2.length][s1.length];
    }
  
    /**
     * Check if a text matches the search query
     * @param text The text to check
     * @param query The search query
     * @returns True if the text matches the query
     */
    matches(text: string, query: string): boolean {
      if (!query) return true;
      const lowerCaseText = text.toLowerCase();
      const lowerCaseQuery = query.toLowerCase();
      
      // Do a simple substring match first
      if (lowerCaseText.includes(lowerCaseQuery)) {
        return true;
      }
      
      // Fall back to Levenshtein distance
      return this.calculateLevenshteinDistance(lowerCaseText, lowerCaseQuery) <= this.maxDistance;
    }
  
    /**
     * Get the original text for an ID
     * @param id The ID to look up
     * @returns The original text, or undefined if not found
     */
    getOriginalText(id: string): string | undefined {
      return this.wordMap.get(id);
    }
  
    /**
     * Updates a text in the search index
     * @param id The ID to update
     * @param newText The new text
     */
    update(id: string, newText: string): void {
      // Remove the old entry
      this.remove(id);
      
      // Add the new entry
      this.insert(newText, id);
    }
  
    /**
     * Removes an ID from the search index
     * @param id The ID to remove
     */
    remove(id: string): void {
      const text = this.wordMap.get(id);
      if (!text) return;
      
      const lowerCaseText = text.toLowerCase();
      
      // Remove from wordMap
      this.wordMap.delete(id);
      
      // Remove from contentMap
      const idsSet = this.contentMap.get(lowerCaseText);
      if (idsSet) {
        idsSet.delete(id);
        if (idsSet.size === 0) {
          this.contentMap.delete(lowerCaseText);
        }
      }
    }
  
    /**
     * Clear all entries from the search index
     */
    clear(): void {
      this.wordMap.clear();
      this.contentMap.clear();
    }
  
    /**
     * Get all IDs currently in the search index
     * @returns Array of all IDs
     */
    getAllIds(): string[] {
      return Array.from(this.wordMap.keys());
    }
    
    /**
     * Get all texts currently in the search index
     * @returns Array of all unique texts
     */
    getAllTexts(): string[] {
      return Array.from(new Set(this.wordMap.values()));
    }
  }