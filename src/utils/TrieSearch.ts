/**
 * A class for fuzzy searching text through both substring matching
 * and Levenshtein distance calculation, supporting multiple IDs per text
 */
export class TrieSearch {
	private wordMap: Map<string, string>;
	private contentMap: Map<string, Set<string>>;
	private readonly maxDistance: number;

	constructor(maxDistance = 2) {
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

		this.wordMap.set(id, text);

		if (!this.contentMap.has(lowerCaseText)) {
			this.contentMap.set(lowerCaseText, new Set<string>());
		}

		this.contentMap.get(lowerCaseText)?.add(id);
	}

	/**
	 * Searches for ids that match the query
	 * @param query The search query
	 * @returns Array of IDs that match the query
	 */
	search(query: string): string[] {
		if (!query) {

			return Array.from(this.wordMap.keys());
		}

		const lowerCaseQuery = query.toLowerCase();
		const result = new Set<string>();

		for (const [text, ids] of this.contentMap.entries()) {
			if (text.includes(lowerCaseQuery)) {
				ids.forEach(id => result.add(id));
			}
		}

		if (result.size > 0) {
			return Array.from(result);
		}

		for (const [text, ids] of this.contentMap.entries()) {
			if (this.calculateLevenshteinDistance(text, lowerCaseQuery) <= this.maxDistance) {
				ids.forEach(id => result.add(id));
			}
		}

		return Array.from(result);
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

		if (lowerCaseText.includes(lowerCaseQuery)) {
			return true;
		}

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

		this.remove(id);

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

		this.wordMap.delete(id);

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

	/**
	 * Calculate Levenshtein distance between two strings
	 * @param s1 First string
	 * @param s2 Second string
	 * @returns Distance between the strings
	 */
	private calculateLevenshteinDistance(s1: string, s2: string): number {

		if (s1 === s2) return 0;
		if (s1.length === 0) return s2.length;
		if (s2.length === 0) return s1.length;

		if (Math.abs(s1.length - s2.length) > this.maxDistance) {
			return Math.max(s1.length, s2.length);
		}

		const track = Array(s2.length + 1).fill(null).map(() =>
			Array(s1.length + 1).fill(null));

		for (let i = 0; i <= s1.length; i++) {
			track[0][i] = i;
		}

		for (let j = 0; j <= s2.length; j++) {
			track[j][0] = j;
		}

		for (let j = 1; j <= s2.length; j++) {
			for (let i = 1; i <= s1.length; i++) {
				const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
				track[j][i] = Math.min(
					track[j][i - 1] + 1,
					track[j - 1][i] + 1,
					track[j - 1][i - 1] + indicator
				);
			}
		}

		return track[s2.length][s1.length];
	}
}