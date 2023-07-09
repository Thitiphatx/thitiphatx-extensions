import {
    SourceManga,
    Chapter,
    ChapterDetails,
    HomeSection,
    SearchRequest,
    PagedResults,
    SourceInfo,
    ContentRating,
    BadgeColor,
    Request,
    Response,
    TagSection,
    SourceIntents,
    ChapterProviding,
    MangaProviding,
    SearchResultsProviding,
    HomePageSectionsProviding,
} from '@paperback/types'

import {
    parseChapterDetails,
    isLastPage,
    parseChapters,
    parseHomeSections,
    parseMangaDetails,
    parseViewMore,
    parseTags,
    parseSearch,
    parseRandomSections,
    parseSearchtag
} from './MikudoujinParser'

const BASE_URL = 'http://miku-doujin.com'

export const MikudoujinInfo: SourceInfo = {
    version: '1.0.0',
    name: 'Mikudoujin',
    icon: 'icon.png',
    author: 'Thitiphat',
    authorWebsite: 'https://github.com/Thitiphatx',
    description: 'Extension that pulls manga from miku-doujin',
    contentRating: ContentRating.MATURE,
    websiteBaseURL: BASE_URL,
    sourceTags: [
        {
            text: 'Thai',
            type: BadgeColor.BLUE
        },
        {
            text: 'Hentai',
            type: BadgeColor.RED
        }
    ],
    language: 'th',
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS
}

export class Mikudoujin implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {

    constructor(private cheerio: CheerioAPI) { }
    
    requestManager = App.createRequestManager({
        requestsPerSecond: 4,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
                        'referer': `${BASE_URL}/`,
                    }
                }
                return request
            },
            interceptResponse: async (response: Response): Promise<Response> => {
                return response
            }
        }
    });

    getMangaShareUrl(mangaId: string): string { return `${BASE_URL}/${mangaId}` }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const request = App.createRequest({
            url: `${BASE_URL}`,
            method: 'GET',
            param: `/${mangaId}/`,
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data as string)
        return parseMangaDetails($, mangaId)
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = App.createRequest({
            url: `${BASE_URL}`,
            method: 'GET',
            param: `/${mangaId}/`,
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data as string)
        return parseChapters($, mangaId)
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        let request;
        if (chapterId != "null") {
            request = App.createRequest({
                url: `${BASE_URL}/${mangaId}/${chapterId}/`,
                method: 'GET',
            })
        }
        else {
            request = App.createRequest({
                url: `${BASE_URL}/${mangaId}/`,
                method: 'GET',
            })
        }
        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        return parseChapterDetails($, mangaId, chapterId)
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
         // Recent update
         const request1 = App.createRequest({
            url: `${BASE_URL}`,
            method: 'GET',
        })
        const response1 = await this.requestManager.schedule(request1, 1)
        const $1 = this.cheerio.load(response1.data)
        parseHomeSections($1, sectionCallback)

        // Random
        const ids: string[] = ['52e6d','wfxsq','ng709','sbjdo','3xuxg','3p47g']

        for (const id of ids) {
            const request2 = App.createRequest({
                url: `${BASE_URL}/${id}/`,
                method: 'GET',
            })
            const response2 = await this.requestManager.schedule(request2, 1)
            const $2 = this.cheerio.load(response2.data)
            parseRandomSections(id ,$2, sectionCallback)
        }
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        if (metadata?.completed) return metadata

        const page: number = metadata?.page ?? 1
        let param = ''

        switch (homepageSectionId) {
            case 'latest_doujin':
                param = `${page}`
                break
            default:
                throw new Error('Requested to getViewMoreItems for a section ID which doesn\'t exist')
        }

        const request = App.createRequest({
            url: `${BASE_URL}/?page=${param}`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data as string)
        const manga = parseViewMore($)

        metadata = !isLastPage($) ? { page: page + 1 } : undefined
        return App.createPagedResults({
            results: manga,
            metadata
        })
    }

    async getSearchTags(): Promise<TagSection[]> {
        const request = App.createRequest({
            url: BASE_URL,
            method: 'GET',
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        return parseTags($) || []
    }

    async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1

        let request
        if (query.title === '') {
            return App.createPagedResults({
                results: [],
            })
        }
        if (query.title) {
            request = App.createRequest({
                url: `${encodeURI(query.title ?? '')}`,
                method: 'GET',
            })

            const response = await this.requestManager.schedule(request, 1)
            const $ = this.cheerio.load(response.data)

            let id = query.title.split('/')[3] ?? '';
            const manga = parseSearch($, id)

            return App.createPagedResults({
                results: manga,
            })
        }
        else {
            if ((query?.includedTags?.map((x: any) => x.label)[0]).includes('เรื่อง')) {
                request = App.createRequest({
                    url: `${BASE_URL}/story/${encodeURI(query?.includedTags?.map((x: any) => x.id)[0])}/?page=${page}`,
                    method: 'GET',
                })
    
                const response = await this.requestManager.schedule(request, 1)
                const $ = this.cheerio.load(response.data)
                metadata = page + 10
                const manga = parseSearchtag($)
                return App.createPagedResults({
                    results: manga,
                    metadata,
                })
            }
            else {
                request = App.createRequest({
                    url: `${BASE_URL}/artist/${encodeURI(query?.includedTags?.map((x: any) => x.id)[0])}/?page=${page}`,
                    method: 'GET',
                })
    
                const response = await this.requestManager.schedule(request, 1)
                const $ = this.cheerio.load(response.data)
                if ($('#sub-navbar > div > nav > div > span:nth-child(3) > a > span').text() != '') {
                    metadata = !isLastPage($) ? { page: page + 1 } : undefined
                
                    const manga = parseSearchtag($)
                    return App.createPagedResults({
                        results: manga,
                        metadata
                    })
                }
                else {
                    request = App.createRequest({
                        url: `https://miku-doujin.com/genre/${encodeURI(query?.includedTags?.map((x: any) => x.id)[0])}/?page=${page}`,
                        method: 'GET',
                    })
                    const response = await this.requestManager.schedule(request, 1)
                    const $ = this.cheerio.load(response.data)
                    metadata = !isLastPage($) ? { page: page + 1 } : undefined
                
                    const manga = parseSearchtag($)
                    return App.createPagedResults({
                        results: manga,
                        metadata
                    })
                }
            }
        }
    }

}
