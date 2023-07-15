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
    HomeSectionType,
    PartialSourceManga,
    DUISection,
    SourceStateManager,
} from '@paperback/types'

import {
    parseChapterDetails,
    isLastPage,
    parseChapters,
    parseHomeSections,
    parseMangaDetails,
    parseViewMore,
    parseTags,
    parseRandomSections,
    parseSearchtag
} from './MikudoujinParser'

import { SearchResponse } from './MikudoujinInterfaces'

import {
    getCSEapi,
    resetSettings,
    settings
} from './MikudoujinSettings'

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
        if (chapterId != mangaId) {
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
        const manga_array: PartialSourceManga[] = []
        const randomSection = App.createHomeSection({
            id: 'random',
            title: 'Random Doujin',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal
        })

        for (const id of ids) {

            const request2 = App.createRequest({
                url: `${BASE_URL}/${id}/`,
                method: 'GET',
            })

            const response2 = await this.requestManager.schedule(request2, 1)
            const $2 = this.cheerio.load(response2.data)
        
            for (const item of $2('div.col-6.col-sm-4.col-md-3.mb-3.inz-col', 'div.container > div.row > div.col-12.col-md-9 > div.card > div.card-body > div.row').toArray()) {
                let image: string = $2('a > img', item).first().attr('src') ?? ''
        
                const title: string = $2('a > div.inz-thumbnail-title-box > div.inz-title', item).first().text().trim() ?? ''
                const id: string = $2('a', item).attr('href').split('/')[3] ?? ''
                if (!id || !title) continue
                manga_array.push(App.createPartialSourceManga({
                    mangaId: id,
                    image: encodeURI(image),
                    title: decodeURI(title),
                }))
            }
        }
        randomSection.items = manga_array
        sectionCallback(randomSection)
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

    async CSEapi(stateManager: SourceStateManager): Promise<string> {
        const key = await getCSEapi(stateManager)
        return key
    }
}
