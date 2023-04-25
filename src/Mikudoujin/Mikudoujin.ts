import {
    Source,
    Manga,
    Chapter,
    ChapterDetails,
    HomeSection,
    SearchRequest,
    PagedResults,
    SourceInfo,
    ContentRating,
    MangaUpdates,
    TagType,
    TagSection,
    Request,
    Response,
} from 'paperback-extensions-common'

import {
    parseChapterDetails,
    isLastPage,
    parseChapters,
    parseHomeSections,
    parseMangaDetails,
    parseViewMore,
    parseSearchtag,
    parseSearch,
    parseTags,
    parseUpdatedManga,
    UpdatedManga,
} from './MikudoujinParser'

import {
    SearchData,
} from './MikudoujinHelper'

const MD_DOMAIN = 'https://www.miku-doujin.com'

export const MikudoujinInfo: SourceInfo = {
    version: '1.0.2',
    name: 'Mikudoujin',
    icon: 'icon.png',
    author: 'Thitiphatx',
    authorWebsite: 'https://github.com/Thitiphatx',
    description: 'Extension that pulls comics from miku-doujin.com.',
    contentRating: ContentRating.MATURE,
    websiteBaseURL: MD_DOMAIN,
    sourceTags: [
        {
            text: '18+',
            type: TagType.RED,
        },
    ],
}

export class Mikudoujin extends Source {
    requestManager = createRequestManager({
        requestsPerSecond: 4,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {

                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
                        'referer': MD_DOMAIN,
                    },

                }

                return request
            },

            interceptResponse: async (response: Response): Promise<Response> => {
                return response
            },
        },
    })


    override getMangaShareUrl(mangaId: string): string { return `${MD_DOMAIN}/${mangaId}` }

    override async getMangaDetails(mangaId: string): Promise<Manga> {
        const request = createRequestObject({
            url: `${MD_DOMAIN}`,
            method: 'GET',
            param: `/${mangaId}/`,
        })
        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        return parseMangaDetails($, mangaId)
    }

    override async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = createRequestObject({
            url: `${MD_DOMAIN}`,
            method: 'GET',
            param: `/${mangaId}/`,
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        return parseChapters($, mangaId)
    }

    override async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        if (chapterId != "null") {
            const request = createRequestObject({
                url: `${MD_DOMAIN}/${mangaId}/${chapterId}/`,
                method: 'GET',
            })
            const response = await this.requestManager.schedule(request, 1)
            const $ = this.cheerio.load(response.data)
            return parseChapterDetails($, mangaId, chapterId)
        }
        else {
            const request = createRequestObject({
                url: `${MD_DOMAIN}/${mangaId}/`,
                method: 'GET',
            })
            const response = await this.requestManager.schedule(request, 1)
            const $ = this.cheerio.load(response.data)
            return parseChapterDetails($, mangaId, chapterId)
        }
        
    }

    override async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]): Promise<void> {
        let page = 1
        let updatedManga: UpdatedManga = {
            ids: [],
            loadMore: true,
        }

        while (updatedManga.loadMore) {
            const request = createRequestObject({
                url: `${MD_DOMAIN}/?page=${page}`,
                method: 'GET',
            })
            page++
            const response = await this.requestManager.schedule(request, 1)
            const $ = this.cheerio.load(response.data)

            updatedManga = parseUpdatedManga($, time, ids)
            if (updatedManga.ids.length > 0) {
                mangaUpdatesFoundCallback(createMangaUpdates({
                    ids: updatedManga.ids,
                }))
            }
        }

    }

    override async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const request = createRequestObject({
            url: `${MD_DOMAIN}`,
            method: 'GET',
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        parseHomeSections($, sectionCallback)
    }
    override async getViewMoreItems(homepageSectionId: string, metadata: { page?: number }): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1
        let param = ''
        switch (homepageSectionId) {
            case 'latest_doujin':
                param = `${page}`
                break
            default:
                throw new Error('Requested to getViewMoreItems for a section ID which doesn\'t exist')
        }
    
        const request = createRequestObject({
            url: `${MD_DOMAIN}/?page=`,
            method: 'GET',
            param,
        })
    
        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
    
        const manga = parseViewMore($)
        metadata = !isLastPage($) ? { page: page + 1 } : {}
        return createPagedResults({
            results: manga,
            metadata,
        })
    }

    override async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1
        let request
        let api = '';
        if (query.title) {
            request = createRequestObject({
                url: `https://www.googleapis.com/customsearch/v1?key=${api}&cx=044d529bc9421486e&q=${encodeURI(query.title ?? '')}`,
                method: 'GET',
            })

            const response = await this.requestManager.schedule(request, 1)
            let data: SearchData[]
            try {
                data = JSON.parse(response.data)
            } catch (e) {
                throw new Error(`${e}`)
            }
            const manga = parseSearch(data)
            return createPagedResults({
                results: manga,
                metadata
            })
        }
        else {
            request = createRequestObject({
                
                url: `https://miku-doujin.com/genre/${encodeURI(query?.includedTags?.map((x: any) => x.id)[0])}/?page=${page}`,
                method: 'GET',
            })
            
            const response = await this.requestManager.schedule(request, 1)
            const $ = this.cheerio.load(response.data)
            metadata = !isLastPage($) ? { page: page + 1 } : undefined
            
            const manga = parseSearchtag($)

            return createPagedResults({
                results: manga,
                metadata
            })
        }
    }

    override async getTags(): Promise<TagSection[]> {
        const request = createRequestObject({
            url: MD_DOMAIN,
            method: 'GET',
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        return parseTags($) || []
    }
}