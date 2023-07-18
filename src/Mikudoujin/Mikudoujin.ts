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
    PartialSourceManga,
    DUISection,
    SourceStateManager,
} from '@paperback/types'

import {
    parseChapterDetails,
    isLastPage,
    parseChapters,
    parseHomeSections,
    parseRandomSections,
    parseRandomId,
    parseRandomViewmore,
    parseMangaDetails,
    parseViewMore,
    parseTags,
} from './MikudoujinParser'

import { SearchResponse } from './MikudoujinInterfaces'

import {
    getCSEapi,
    resetSettings,
    settings
} from './MikudoujinSettings'

const BASE_URL = 'https://miku-doujin.com'

export const MikudoujinInfo: SourceInfo = {
    version: '1.0.1',
    name: 'Mikudoujin',
    icon: 'icon.png',
    author: 'Thitiphat',
    authorWebsite: 'https://github.com/Thitiphatx',
    description: `Extension that pulls manga from ${BASE_URL}`,
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
    language: '🇹🇭',
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS | SourceIntents.SETTINGS_UI
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
                        'referer': `${BASE_URL}`,
                    }
                }
                return request
            },
            interceptResponse: async (response: Response): Promise<Response> => {
                return response
            }
        }
    });

    stateManager = App.createSourceStateManager()
    async getSourceMenu(): Promise<DUISection> {
        return Promise.resolve(App.createDUISection({
            id: 'main',
            header: 'Source Settings',
            rows: () => Promise.resolve([
                settings(this.stateManager),
                resetSettings(this.stateManager)
            ]),
            isHidden: false
        }))
    }
    getMangaShareUrl(mangaId: string): string { return `${BASE_URL}/${mangaId}` }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const request = App.createRequest({
            url: `${BASE_URL}/${mangaId}/`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data as string)
        return parseMangaDetails($, mangaId)
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = App.createRequest({
            url: `${BASE_URL}/${mangaId}/`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data as string)
        return parseChapters($, mangaId)
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        let request
        if (mangaId === chapterId) {
            request = App.createRequest({
                url: `${BASE_URL}/${chapterId}/`,
                method: 'GET',
            })
        }
        else {
            request = App.createRequest({
                url: `${BASE_URL}/${mangaId}/${chapterId}/`,
                method: 'GET',
            })
        }

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data as string)

        return parseChapterDetails($, mangaId, chapterId)
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const request = App.createRequest({
            url: `${BASE_URL}`,
            method: 'GET',
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data as string)
        parseHomeSections($, sectionCallback)

        const request2 = App.createRequest({
            url: `${BASE_URL}/52e6d/`,
            method: 'GET',
        })

        const response2 = await this.requestManager.schedule(request2, 1)
        const $2 = this.cheerio.load(response2.data as string)
        parseRandomSections($2, sectionCallback)
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        
        if (metadata?.completed) return metadata
        const collectedIds: string[] = ['84vpp']
        const page: number = metadata?.page ?? 1
        let param

        if (homepageSectionId == 'latest_doujin') {
            param = `${page}`
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
        else {
            const lastIndex = collectedIds.length - 1
            console.log(metadata)

            if (page > lastIndex) {
                
                const request2 = App.createRequest({
                    url: `${BASE_URL}/${collectedIds[lastIndex]}/`,
                    method: 'GET'
                })
        
                const response2 = await this.requestManager.schedule(request2, 1)
                const $2 = this.cheerio.load(response2.data as string)

                const newIds = parseRandomId($2,collectedIds)
                console.log(newIds)
                collectedIds.push(...newIds)
            }
                const request = App.createRequest({
                    url: `${BASE_URL}/${collectedIds[page]}/`,
                    method: 'GET'
                })
        
                const response = await this.requestManager.schedule(request, 1)
                const $ = this.cheerio.load(response.data as string)
                const manga = parseRandomViewmore($)

                metadata = true ? { page: page + 1 } : undefined
                return App.createPagedResults({
                results: manga,
                metadata
            })
        }
    }

    async getSearchTags(): Promise<TagSection[]> {
        const request = App.createRequest({
            url: `${BASE_URL}`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data as string)
        return parseTags($)
    }

    async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1

        let request
        if (query.title) {
            const apikey = await this.CSEapi(this.stateManager)
            const searchEngineId = '009358231530793211456:xtfjzcegcz8';

            request = App.createRequest({
                url: `https://www.googleapis.com/customsearch/v1?key=${apikey}&cx=${searchEngineId}&q=${encodeURIComponent(query.title ?? '')}`,
                method: 'GET',
            })

            const response = await this.requestManager.schedule(request, 1)
            let data: SearchResponse
            try {
                data = JSON.parse(response.data as string)
            } catch (e) {
                throw new Error(`${e}`)
            }

            // parseSearch
            const mangaItems: PartialSourceManga[] = []
            const collectedIds: string[] = []
        
            if(data.items) {
                for (const manga of data.items) {
                    const id: string = manga.link?.split("/")[3] ?? "";
                    const title: string = manga.title.trim()
    
                    const request2 = App.createRequest({
                        url: `${BASE_URL}/${id}/`,
                        method: 'GET',
                    })
            
                    const response2 = await this.requestManager.schedule(request2, 1)
                    const $2 = this.cheerio.load(response2.data)
            
                    const row = $2('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row');
                    let image: string = $2('div.col-12.col-md-4 > img',row).attr('src') ?? 'https://i.imgur.com/GYUxEX8.png'
    
                    if (!id || !title) continue
    
                    if (collectedIds.includes(id)) continue
    
                    mangaItems.push(App.createPartialSourceManga({
                        mangaId: id,
                        image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
                        title: title,
                    }))
                    collectedIds.push(id)
    
                }
            }
            
            return App.createPagedResults({
                results: mangaItems,
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
                const manga = parseViewMore($)
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
                
                    const manga = parseViewMore($)
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
                
                    const manga = parseViewMore($)
                    return App.createPagedResults({
                        results: manga,
                        metadata
                    })
                }
            }
        }
    }

    async CSEapi(stateManager: SourceStateManager): Promise<string> {
        const key = await getCSEapi(stateManager)
        return key
    }

};
