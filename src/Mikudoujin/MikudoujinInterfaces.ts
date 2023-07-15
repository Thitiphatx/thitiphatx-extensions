export interface SearchResponse {
    items: SearchResult[];
}

interface SearchResult {
    title: string;
    link: string;
    snippet: string;
}