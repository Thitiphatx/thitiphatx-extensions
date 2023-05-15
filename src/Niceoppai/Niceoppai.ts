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
    parseUpdatedManga,
    UpdatedManga,
} from './NiceoppaiParser'

const NO_DOMAIN = 'https://www.niceoppai.net'
let globalUA: string | null

export const NiceoppaiInfo: SourceInfo = {
    version: '1.0.8',
    name: 'Niceoppai',
    icon: 'icon.png', 
    author: 'Thitiphatx',
    authorWebsite: 'https://github.com/Thitiphatx',
    description: 'Extension that pulls comics from Niceoppai.net.',
    contentRating: ContentRating.MATURE,
    websiteBaseURL: NO_DOMAIN,
    sourceTags: [
        {
            text: 'Recommend',
            type: TagType.GREEN,
        },
    ],
}

export class Niceoppai extends Source {
    readonly cookies = [
        createCookie({ name: 'wpm_wgt_mng_idx_2_tab', value: '0', domain: `${NO_DOMAIN}` })
    ]

    requestManager = createRequestManager({
        requestsPerSecond: 3,
        requestTimeout: 45000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {

                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
                        'referer': NO_DOMAIN,
                        'cookie': 'wpm_wgt_mng_idx_2_tab=0',
                        'userAgent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Edg/113.0.1774.42",
                    },

                }

                return request
            },

            interceptResponse: async (response: Response): Promise<Response> => {
                return response
            },
        },
    })


    override getMangaShareUrl(mangaId: string): string { return `${NO_DOMAIN}/${mangaId}` }

    override async getMangaDetails(mangaId: string): Promise<Manga> {
        const request = createRequestObject({
            url: `${NO_DOMAIN}/`,
            method: 'GET',
            param: mangaId,
        })
        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        return parseMangaDetails($, mangaId)
    }

    override async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = createRequestObject({
            url: `${NO_DOMAIN}/`,
            method: 'GET',
            param: mangaId,
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        return parseChapters($, mangaId)
    }

    override async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const request = createRequestObject({
            url: `${NO_DOMAIN}/${mangaId}/${chapterId}`,
            method: 'GET',
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
                url: `${NO_DOMAIN}/latest-chapters/${page}`,
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
            url: encodeURI(`https://www.niceoppai.net/manga_list/all/any/last-updated/`),
            method: 'GET',
            cookies: this.cookies,
        })
        const response = await this.requestManager.schedule(request, 3)
        console.log('response is :', response)
        const $ = this.cheerio.load(response.data)
        return parseHomeSections($, sectionCallback)
            
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
            url: `${NO_DOMAIN}/latest-chapters/`,
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
        const request = createRequestObject({
            url: `${NO_DOMAIN}/manga_list/search/${encodeURI(query.title ?? '')}`,
            method: 'GET',
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        const manga = parseSearch($)

        return createPagedResults({
            results: manga,
        })

    }

    override getCloudflareBypassRequest(): Request {
        return createRequestObject({
            url: NO_DOMAIN,
            method: 'GET',
            headers: {
                ...(globalUA && { 'user-agent': globalUA }),
                'referer': `${NO_DOMAIN}.`
            }
        })
    }

    CloudFlareError(status: any) {
        if (status == 503) {
            throw new Error('CLOUDFLARE BYPASS ERROR:\nPlease go to Settings > Sources > <The name of this source> and press Cloudflare Bypass')
        }
    }
}