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
} from './NekopostParser'

import { 
    ChapterDetailsImages,
    MangaDetails,
    HomeData,
} from './NekopostHelper'

const NP_DOMAIN = 'https://www.nekopost.net'

export const NekopostInfo: SourceInfo = {
    version: '1.0.0',
    name: 'Nekopost',
    icon: 'icon.png',
    author: 'Thitiphatx',
    authorWebsite: 'https://github.com/Thitiphatx',
    description: 'Extension that pulls comics from Nekopost.net.',
    contentRating: ContentRating.MATURE,
    websiteBaseURL: NP_DOMAIN,
    sourceTags: [
        {
            text: 'Recommend',
            type: TagType.GREEN,
        },
    ],
}

export class Nekopost extends Source {
    requestManager = createRequestManager({
        requestsPerSecond: 4,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {

                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
                        'referer': NP_DOMAIN,
                    },

                }

                return request
            },

            interceptResponse: async (response: Response): Promise<Response> => {
                return response
            },
        },
    })


    override getMangaShareUrl(mangaId: string): string { return `${NP_DOMAIN}/manga/${mangaId}` }

    override async getMangaDetails(mangaId: string): Promise<Manga> {
        const request = createRequestObject({
            url: `https://api.osemocphoto.com/frontAPI/getProjectInfo/`,
            method: 'GET',
            param: mangaId,
        })
        const response = await this.requestManager.schedule(request, 1)

        let data: MangaDetails
        try {
            data = JSON.parse(response.data)
        } catch (e) {
            throw new Error(`${e}`)
        }

        return parseMangaDetails(data, mangaId)
    }

    override async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = createRequestObject({
            url: `https://api.osemocphoto.com/frontAPI/getProjectInfo/`,
            method: 'GET',
            param: mangaId,
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        return parseChapters($, mangaId)
    }

    override async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const request = createRequestObject({
            url: `${NP_DOMAIN}/manga/${mangaId}/${chapterId}`,
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
                url: `https://api.osemocphoto.com/frontAPI/getLatestChapter/m/0/${page+= 12}`,
                method: 'GET',
            })

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
            url: `https://api.osemocphoto.com/frontAPI/getLatestChapter/m/0/`,
            method: 'GET',
        })

        const response = await this.requestManager.schedule(request, 1)

        let data: HomeData
        try {
            data = JSON.parse(response.data)
        } catch (e) {
            throw new Error(`${e}`)
        }
        parseHomeSections(data, sectionCallback)
    }
    override async getViewMoreItems(homepageSectionId: string, metadata: { page?: number }): Promise<PagedResults> {
        const page: number = metadata?.page ?? 12
        let param = ''
        switch (homepageSectionId) {
            case 'latest_comic':
                param = `${page}`
                break
            default:
                throw new Error('Requested to getViewMoreItems for a section ID which doesn\'t exist')
        }
    
        const request = createRequestObject({
            url: `https://api.osemocphoto.com/frontAPI/getLatestChapter/m/0/${page}`,
            method: 'GET',
            param,
        })
    
        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
    
        const manga = parseViewMore($)
        metadata = !isLastPage($) ? { page: page + 12 } : {}
        return createPagedResults({
            results: manga,
            metadata,
        })
    }

    override async getSearchResults(query: SearchRequest): Promise<PagedResults> {
        const request = createRequestObject({
            url: `${NP_DOMAIN}/manga_list/search/${encodeURI(query.title ?? '')}`,
            method: 'GET',
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        const manga = parseSearch($)

        return createPagedResults({
            results: manga,
        })

    }
}