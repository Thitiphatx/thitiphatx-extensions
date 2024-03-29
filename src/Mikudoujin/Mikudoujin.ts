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
    parseRandomSections,
    parseMangaDetails,
    parseViewMore,
    parseSearchtag,
    parseSearch,
    parseTags,
    parseUpdatedManga,
    UpdatedManga,
} from './MikudoujinParser'

const MD_DOMAIN = 'https://www.miku-doujin.com'

export const MikudoujinInfo: SourceInfo = {
    version: '1.0.6',
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


    override getMangaShareUrl(mangaId: string): string { return `${MD_DOMAIN}/${mangaId}/` }

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

        // Recent update
        const request1 = createRequestObject({
            url: `${MD_DOMAIN}`,
            method: 'GET',
        })
        const response1 = await this.requestManager.schedule(request1, 1)
        const $1 = this.cheerio.load(response1.data)
        parseHomeSections($1, sectionCallback)

        // Random
        const ids: string[] = ['52e6d','wfxsq','ng709','sbjdo','3xuxg','3p47g']

        for (const id of ids) {
            const request2 = createRequestObject({
                url: `${MD_DOMAIN}/${id}/`,
                method: 'GET',
            })
            const response2 = await this.requestManager.schedule(request2, 1)
            const $2 = this.cheerio.load(response2.data)
            parseRandomSections(id ,$2, sectionCallback)
        }
        
        
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
        if (query.title) {
            request = createRequestObject({
                url: `${encodeURI(query.title ?? '')}`,
                method: 'GET',
            })

            const response = await this.requestManager.schedule(request, 1)
            const $ = this.cheerio.load(response.data)

            let id = query.title.split('/')[3] ?? '';
            const manga = parseSearch($, id)

            return createPagedResults({
                results: manga,
            })
        }
        else {
            if ((query?.includedTags?.map((x: any) => x.label)[0]).includes('เรื่อง')) {
                request = createRequestObject({
                    url: `${MD_DOMAIN}/story/${encodeURI(query?.includedTags?.map((x: any) => x.id)[0])}/?page=${page}`,
                    method: 'GET',
                })
    
                const response = await this.requestManager.schedule(request, 1)
                const $ = this.cheerio.load(response.data)

                metadata = !isLastPage($) ? { page: page + 1 } : undefined
                const manga = parseSearchtag($)
                return createPagedResults({
                    results: manga,
                    metadata,
                })
            }
            else {
                request = createRequestObject({
                    url: `${MD_DOMAIN}/artist/${encodeURI(query?.includedTags?.map((x: any) => x.id)[0])}/?page=${page}`,
                    method: 'GET',
                })
    
                const response = await this.requestManager.schedule(request, 1)
                const $ = this.cheerio.load(response.data)
                if ($('#sub-navbar > div > nav > div > span:nth-child(3) > a > span').text() != '') {
                    metadata = !isLastPage($) ? { page: page + 1 } : undefined
                
                    const manga = parseSearchtag($)
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