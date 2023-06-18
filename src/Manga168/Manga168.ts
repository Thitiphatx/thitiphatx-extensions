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
    parseSearch,
    parseTags,
    parseUpdatedManga,
    UpdatedManga,
} from './Manga168Parser'

const M1_DOMAIN = 'https://manga168.com'

export const Manga168Info: SourceInfo = {
    version: '1.0.0',
    name: 'Manga168',
    icon: 'icon.png',
    author: 'Thitiphatx',
    authorWebsite: 'https://github.com/Thitiphatx',
    description: 'Extension that pulls comics from manga168.com',
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: M1_DOMAIN,
    sourceTags: [
        {
            text: 'Recommend',
            type: TagType.GREEN,
        },
    ],
}

export class Manga168 extends Source {
    readonly cookies = [
        createCookie({ name: 'configPageView', value: 'all', domain: `${M1_DOMAIN}` })
    ]

    requestManager = createRequestManager({
        requestsPerSecond: 4,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {

                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
                        'referer': M1_DOMAIN,
                    },

                };
                return request
            },

            interceptResponse: async (response: Response): Promise<Response> => {
                return response
            },
        },
    })


    override getMangaShareUrl(mangaId: string): string { return `${M1_DOMAIN}/${mangaId}` }

    override async getMangaDetails(mangaId: string): Promise<Manga> {
        const request = createRequestObject({
            url: `${M1_DOMAIN}/manga/${mangaId}/`,
            method: 'GET',
        })
        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        return parseMangaDetails($, mangaId)
    }

    override async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = createRequestObject({
            url: `${M1_DOMAIN}/manga/${mangaId}/`,
            method: 'GET',
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        return parseChapters($, mangaId)
    }
    override async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {

        const request = createRequestObject({
            url: `${M1_DOMAIN}/${chapterId}/`,
            method: 'GET',
            cookies: this.cookies,
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        return parseChapterDetails($, mangaId, chapterId)
    }

    override async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]): Promise<void> {
        let page = 1
        let updatedManga: UpdatedManga = {
            ids: [],
            loadMore: true,
        }

        while (updatedManga.loadMore) {
            const request = createRequestObject({
                url: `${M1_DOMAIN}/page/${page}/`,
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
            url: `${M1_DOMAIN}/page/1/`,
            method: 'GET',
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        parseHomeSections($,sectionCallback)
    }
    override async getViewMoreItems(homepageSectionId: string, metadata: { page?: number }): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1
        let param = ''
        switch (homepageSectionId) {
            case 'latest_comic':
                param = `${page}`
                break
            default:
                throw new Error('Requested to getViewMoreItems for a section ID which doesn\'t exist')
        }
    
        const request = createRequestObject({
            url: `${M1_DOMAIN}/page/`,
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

    override async getSearchResults(query: SearchRequest): Promise<PagedResults> {
        let url: string;
        if (query.title) {
            url = `${M1_DOMAIN}/?s=${encodeURI(query.title ?? '')}`
        }
        else {
            url = `${M1_DOMAIN}/genres/${query?.includedTags?.map((x: any) => x.id)[0]}/`
        }
        const request = createRequestObject({
            url,
            method: 'GET',
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        const manga = parseSearch($)

        return createPagedResults({
            results: manga,
        })

    }

    override async getTags(): Promise<TagSection[]> {
        const request = createRequestObject({
            url: `${M1_DOMAIN}/manga`,
            method: 'GET',
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        return parseTags($) || []
    }
}